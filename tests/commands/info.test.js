'use strict';

const overrideCwd = require('process-utils/override-cwd');
const path = require('path');
const inquirer = require('@serverless/utils/inquirer');
const chalk = require('chalk');
const utils = require('../../src/libs/utils');
const infoCmd = require('../../src/commands/info');

jest.mock('../../src/commands/infoAll.js', () => async () => 'isTemplate');
jest.mock('@serverless-cloud-framework/platform-client-china', () => {
  return {
    ServerlessSDK: class {
      getInstance() {
        if (process.env.error) {
          throw new Error('getInstnce error');
        }
        if (!process.env.status) {
          return {};
        }
        return {
          instance: {
            lastActionAt: Date.now(),
            instanceStatus: process.env.status,
            instanceMetrics: { deployments: 10 },
            deploymentErrorStack: 'errorStack',
            outputs: {
              message: 'output',
            },
          },
        };
      }
    },
    utils: {
      getOrgId: async () => 1,
    },
  };
});

describe('get instance info: src/commands/info', () => {
  let restoreCwd;
  const cli = {
    logLogo: () => {},
    sessionStatus: () => {},
    logOutputs: (msg) => console.log(msg),
    sessionStop: () => {},
    sessionStart: () => {},
    logTypeError: () => {},
  };

  beforeAll(() => {
    cli.log = jest.fn();

    jest.spyOn(utils, 'login').mockImplementation(async () => {});
    jest.spyOn(inquirer, 'prompt').mockImplementation(async () => ({ entryFile: 'koa.js' }));

    restoreCwd = overrideCwd(
      path.resolve(process.cwd(), 'tests/commands/materials/component')
    ).restoreCwd;
  });

  test('run into a template project', async () => {
    const restoreTempCwd = overrideCwd(path.resolve(process.cwd(), '../template')).restoreCwd;

    const result = await infoCmd({}, cli, 'info');

    expect(result).toBe('isTemplate');
    restoreTempCwd();
  });

  test('scf info for an un-deployed instance', async () => {
    try {
      await infoCmd({ target: './' }, cli, 'info');
    } catch (e) {
      expect(e.message).toBe(
        '实例 "scf-test" 不是激活状态. 请先部署实例, 然后再次运行"scf info".'
      );
    }
  });

  test('scf active info', async () => {
    process.env.status = 'active';
    await infoCmd({ target: './', debug: true }, cli, 'info');
    expect(cli.log.mock.calls[4][0]).toMatch(`${chalk.grey('部署次数:')}  10`);
    delete process.env.status;
  });

  test('scf inactive info', async () => {
    process.env.status = 'inactive';
    await infoCmd({ target: './', debug: true }, cli, 'info');
    expect(cli.log.mock.calls[4][0]).toMatch(`${chalk.grey('部署次数:')}  10`);
    delete process.env.status;
  });

  test('scf deploying info', async () => {
    process.env.status = 'deploying';
    await infoCmd({ target: './', debug: true }, cli, 'info');
    expect(cli.log.mock.calls[4][0]).toMatch(`${chalk.grey('部署次数:')}  10`);
    delete process.env.status;
  });

  test('scf info with error', async () => {
    process.env.error = true;
    try {
      await infoCmd({}, cli, 'info');
    } catch (e) {
      expect(e.message).toBe('getInstnce error');
    }

    delete process.env.error;
  });
  afterAll(() => {
    jest.restoreAllMocks();
    restoreCwd();
  });
});
