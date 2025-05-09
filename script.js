let currentMode = 1;
let count = 0;  // 횟수 카운트 변수
let previousAngle = 0;  // 이전 각도 값 (변경된 각도 여부 추적)
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

  let angle, message;

  if (currentMode === 1) {
    angle = calculateAngle(lm[24], lm[26], lm[28]); // 오른쪽: HIP, KNEE, ANKLE
    ctx.fillText(`스쿼트 각도: ${Math.round(angle)}°`, 30, 30);

    if (angle < 95) ctx.fillText("GREAT!", 30, 60);

    if (angle < 95) stage = "down";
    if (angle > 120 && stage === "down") {
      count++;
      stage = "up";
    }
  }

  else if (currentMode === 2) {
    angle = calculateAngle(lm[12], lm[24], lm[26]); // SHOULDER, HIP, KNEE
    ctx.fillText(`런지 각도: ${Math.round(angle)}°`, 30, 30);

    if (angle < 97) ctx.fillText("GREAT!", 30, 60);

    if (angle < 97) stage = "down";
    if (angle > 160 && stage === "down") {
      count++;
      stage = "up";
    }

  } 
  
  else if (currentMode === 3) {
    angle = calculateAngle(lm[12], lm[11], lm[13]); // SHOULDER, ELBOW, WRIST
    ctx.fillText(`사이드암 각도: ${Math.round(angle)}°`, 30, 30);

    if (angle > 140) ctx.fillText("GREAT!", 30, 60);

    if (angle < 115) stage = "down";
    if (angle > 140 && stage === "down") {
      count++;
      stage = "up";
    }

  }

  //ctx.fillText(message, 30, 60);
  document.getElementById("count-display").textContent = `현재 횟수: ${count}`;  // 횟수 업데이트
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
    width: 1920,
    height: 1080
  });

  camera.start();
});
