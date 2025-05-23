let currentMode = 1;
let count = 0;
let previousAngle = 0;
let stage = null;
let downFrameCount = 0;
let upFrameCount = 0;
let side = "left";

function setMode(mode) {
  currentMode = mode;
  count = 0;
  stage = null;
  downFrameCount = 0;
  upFrameCount = 0;
  document.getElementById("mode-text").textContent =
    ["", "스쿼트 모드", "암컬 모드", "사이드암 모드", "크로스 토터치 모드"][mode];
}

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  return angle > 180 ? 360 - angle : angle;
}

function calculateDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isLandmarkVisible(lm, index, threshold = 0.6) {
  return lm[index].visibility !== undefined && lm[index].visibility > threshold;
}

function onResults(results) {
  const canvas = document.getElementById("canvas");
  const video = document.getElementById("webcam");

  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (!results.poseLandmarks) return;

  const flippedLandmarks = results.poseLandmarks.map(p => ({
    ...p,
    x: 1.0 - p.x
  }));

  const faceIndices = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

// 얼굴 제외한 랜드마크만 필터링
const landmarksWithoutFace = flippedLandmarks.map((p, i) =>
  faceIndices.has(i) ? null : p
).filter(p => p !== null);

// 얼굴 제외한 연결만 그리기
const filteredConnections = POSE_CONNECTIONS.filter(([start, end]) =>
  !faceIndices.has(start) && !faceIndices.has(end)
);

// 선 그리기 (얼굴 제외)
drawConnectors(ctx, flippedLandmarks, filteredConnections, {
  color: "#00FF00",
  lineWidth: 3
});

// 점 그리기 (얼굴 제외)
drawLandmarks(ctx, landmarksWithoutFace, {
  color: "#FF0000",
  lineWidth: 1,
  radius: 2
});


  const lm = flippedLandmarks;
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "yellow";

  let angle;

  if (currentMode === 1) {
    if (isLandmarkVisible(lm, 24) && isLandmarkVisible(lm, 26) && isLandmarkVisible(lm, 28)) {
      angle = calculateAngle(lm[24], lm[26], lm[28]);
      if (angle > 30 && angle < 160) {
        ctx.fillText(`스쿼트 각도: ${Math.round(angle)}°`, 30, 30);

        if (angle < 95) {
          downFrameCount++;
          if (downFrameCount > 5) stage = "down";
        } else {
          downFrameCount = 0;
        }

        if (angle > 120 && stage === "down") {
          upFrameCount++;
          if (upFrameCount > 5) {
            count++;
            stage = "up";
            upFrameCount = 0;
          }
        } else {
          upFrameCount = 0;
        }

        if (stage === "down" && angle < 95) {
          ctx.fillText("GREAT!", 30, 60);
        }
      }
    }
  }

  else if (currentMode === 2) {
    angle = calculateAngle(lm[12], lm[14], lm[16]);
    if (angle > 30 && angle < 170) {
      ctx.fillText(`암컬 각도: ${Math.round(angle)}°`, 30, 30);

      if (angle < 70) {
        downFrameCount++;
        if (downFrameCount > 5) stage = "up";
      } else {
        downFrameCount = 0;
      }

      if (angle > 150 && stage === "up") {
        upFrameCount++;
        if (upFrameCount > 5) {
          count++;
          stage = "down";
          upFrameCount = 0;
        }
      } else {
        upFrameCount = 0;
      }

      if (stage === "up" && angle < 70) {
        ctx.fillText("GREAT!", 30, 60);
      }
    }
  }

  else if (currentMode === 3) {
    angle = calculateAngle(lm[12], lm[11], lm[13]);
    ctx.fillText(`사이드암 각도: ${Math.round(angle)}°`, 30, 30);

    if (angle > 140) ctx.fillText("GREAT!", 30, 60);

    if (angle < 115) stage = "down";
    if (angle > 140 && stage === "down") {
      count++;
      stage = "up";
    }
  }

  else if (currentMode === 4) {
    const leftToRightFoot = calculateDistance(lm[15], lm[28]);
    const rightToLeftFoot = calculateDistance(lm[16], lm[27]);

    ctx.fillText(`왼손-오른발: ${leftToRightFoot.toFixed(1)}`, 30, 30);
    ctx.fillText(`오른손-왼발: ${rightToLeftFoot.toFixed(1)}`, 30, 50);

    if (leftToRightFoot < 0.2 || rightToLeftFoot < 0.2) ctx.fillText("GREAT!", 30, 80);

    if (side === "left") {
      if (leftToRightFoot < 0.2) stage = "down-left";
      if (leftToRightFoot > 0.35 && stage === "down-left") {
        stage = "up-left";
        side = "right";
      }
    } else if (side === "right") {
      if (rightToLeftFoot < 0.2) stage = "down-right";
      if (rightToLeftFoot > 0.35 && stage === "down-right") {
        stage = "up-right";
        side = "left";
        count++;
      }
    }
  }

  else if (currentMode === 5) {
    angle = calculateAngle(lm[24], lm[26], lm[28]);
    ctx.fillText(`킥백 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 110) stage = "down";
    if (angle > 150 && stage === "down") {
      count++;
      stage = "up";
      ctx.fillText("굿!", 30, 60);
    }
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

  renderFrame();
});