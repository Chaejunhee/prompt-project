let currentMode = 1;
let count = 0;
let stage = null;

function setMode(mode) {
  currentMode = mode;
  count = 0;
  stage = null;
  document.getElementById("mode-text").textContent =
    ["", "스쿼트 모드", "런지 모드", "사이드암 모드"][mode];
}

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  return angle > 180 ? 360 - angle : angle;
}

function onResults(results) {
  const canvas = document.getElementById("canvas");
  const video = document.getElementById("webcam");

  // 비디오 해상도 기준으로 canvas 사이즈 동기화
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // ✅ 영상도 수동 반전해서 캔버스에 그림
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  if (!results.poseLandmarks) return;

  // ✅ 랜드마크 좌표 좌우 반전 (거울 반영)
  const lm = results.poseLandmarks.map(p => ({
    ...p,
    x: 1.0 - p.x
  }));

  // 랜드마크 및 연결선 그리기
  drawConnectors(ctx, lm, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
  drawLandmarks(ctx, lm, { color: "#FF0000", lineWidth: 1, radius: 2 });

  // 분석 + 카운트
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "yellow";

  let angle;

  if (currentMode === 1) {
    angle = calculateAngle(lm[24], lm[26], lm[28]); // 스쿼트
    ctx.fillText(`스쿼트 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 95) ctx.fillText("GREAT!", 30, 60);
    if (angle < 95) stage = "down";
    if (angle > 120 && stage === "down") { count++; stage = "up"; }
  }

  else if (currentMode === 2) {
    angle = calculateAngle(lm[12], lm[24], lm[26]); // 런지
    ctx.fillText(`런지 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 97) ctx.fillText("GREAT!", 30, 60);
    if (angle < 97) stage = "down";
    if (angle > 160 && stage === "down") { count++; stage = "up"; }
  }

  else if (currentMode === 3) {
    angle = calculateAngle(lm[12], lm[11], lm[13]); // 사이드암
    ctx.fillText(`사이드암 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle > 140) ctx.fillText("GREAT!", 30, 60);
    if (angle < 115) stage = "down";
    if (angle > 140 && stage === "down") { count++; stage = "up"; }
  }

  document.getElementById("count-display").textContent = `현재 횟수: ${count}`;
}

document.getElementById("start-button").addEventListener("click", async () => {
  const video = document.getElementById("webcam");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: "user"
    }
  });
  video.srcObject = stream;

  // canvas 크기 동기화
  video.onloadedmetadata = () => {
    const canvas = document.getElementById("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  };

  const pose = new Pose({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  pose.onResults(onResults);

  async function renderFrame() {
    await pose.send({ image: video });
    requestAnimationFrame(renderFrame);
  }

  renderFrame(); // 루프 시작
});
