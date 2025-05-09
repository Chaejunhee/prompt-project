let currentMode = 1;

function setMode(mode) {
  currentMode = mode;
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
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) return;

  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,
    { color: "#00FF00", lineWidth: 3 });
  drawLandmarks(ctx, results.poseLandmarks, {
      color: "#FF0000",
      lineWidth: 1,    // 선 얇게
      radius: 2        // 점 작게 (기본은 5 정도)
   });

  const lm = results.poseLandmarks;
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "yellow";

  if (currentMode === 1) {
    const angle = calculateAngle(lm[24], lm[26], lm[28]); // 오른쪽: HIP, KNEE, ANKLE
    ctx.fillText(`스쿼트 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 80) ctx.fillText("무릎을 더 굽히세요!", 30, 60);
  } else if (currentMode === 2) {
    const angle = calculateAngle(lm[12], lm[24], lm[26]); // SHOULDER, HIP, KNEE
    ctx.fillText(`런지 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 90) ctx.fillText("허리를 세우세요!", 30, 60);
  } else if (currentMode === 3) {
    const angle = calculateAngle(lm[11], lm[13], lm[15]); // SHOULDER, ELBOW, WRIST
    ctx.fillText(`사이드암 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 45) ctx.fillText("팔을 더 올리세요!", 30, 60);
  }
}

document.getElementById("start-button").addEventListener("click", async () => {
  const video = document.getElementById("webcam");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

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

  const camera = new Camera(video, {
    onFrame: async () => {
      await pose.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
});
