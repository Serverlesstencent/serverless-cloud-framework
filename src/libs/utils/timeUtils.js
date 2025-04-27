/**
 * 获取系统Unix Nano时间戳
 * @returns Unix Nano时间戳
 */
function getUnixNanoTime() {
  // 初始化基准时间
  const initialHrTime = process.hrtime();
  const initialMs = Date.now();
  // 计算当前时间差
  const hrTime = process.hrtime(initialHrTime);
  let unixNanoTime = 0;
  if (hrTime && hrTime.length > 1 && initialMs) {
    // 转换为 BigInt 避免精度丢失
    const nsElapsed = BigInt(hrTime[0]) * BigInt(1e9) + BigInt(hrTime[1]);
    unixNanoTime = BigInt(initialMs) * BigInt(1e6) + nsElapsed;
  }
  return unixNanoTime.toString();
}

module.exports = {
    getUnixNanoTime
}