'use strict';

const { v1: uuid } = require('uuid');
const { join } = require('path');
const fse = require('fs-extra');
const isTelemetryDisabled = require('./areDisabled');
const cacheDirPath = require('./cache-path');
const got = require('got');
const { utils: chinaUtils } = require('@serverless-cloud-framework/platform-client-china');
const generatePayload = require('./generatePayload');

const timestampWeekBefore = Date.now() - 1000 * 60 * 60 * 24 * 7;

const isUuid = RegExp.prototype.test.bind(
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
);
// Store telemtry data locally and send them later while deploying
const storeLocally = async (payload = {}, err = null) => {
  if (err) {
    payload.err = err;
  }

  if (isTelemetryDisabled || !cacheDirPath || !payload.event) return null;
  const id = uuid();

  return (async function self() {
    try {
      return await fse.writeJson(join(cacheDirPath, id), {
        payload,
        timestamp: Date.now(),
      });
    } catch (error) /* istanbul ignore next */ {
      if (error.code === 'ENOENT') {
        try {
          await fse.ensureDir(cacheDirPath);
          return self();
        } catch (ensureDirError) {
          return null;
        }
      }
      return null;
    }
  })();
};

const send = async () => {
  if (isTelemetryDisabled || !cacheDirPath) return null;
  let dirFilenames;

  try {
    dirFilenames = await fse.readdir(cacheDirPath);
  } catch (readdirError) {
    return null;
  }

  const payloadsWithIds = (
    await Promise.all(
      dirFilenames.map(async (dirFilename) => {
        if (!isUuid(dirFilename)) return null;
        let data;
        try {
          data = await fse.readJson(join(cacheDirPath, dirFilename));
        } catch (readJsonError) /* istanbul ignore next */ {
          if (readJsonError.code === 'ENOENT') return null; // Race condition
          const cacheFile = join(cacheDirPath, dirFilename);
          try {
            return await fse.unlink(cacheFile);
          } catch (error) {
            return null;
          }
        }

        if (data && data.payload) {
          const timestamp = Number(data.timestamp);
          // If current payload's created time is in 2 weeks, report it, or it's older than 2 weeks, we delete it below
          if (timestamp > timestampWeekBefore) {
            return {
              payload: data.payload,
              id: dirFilename,
            };
          }
        }

        const cacheFile = join(cacheDirPath, dirFilename);
        try {
          return await fse.unlink(cacheFile);
        } catch (error) {
          return null;
        }
      })
    )
  ).filter(Boolean);

  if (!payloadsWithIds.length) return null;

  return null;
};

module.exports = { storeLocally, send, generatePayload };
