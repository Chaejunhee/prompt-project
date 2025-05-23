let currentMode = 1;
let count = 0;
let stage = null;

let downFrameCount = 0;
let upFrameCount = 0;

function setMode(mode) {
  currentMode = mode;
  count = 0;
  stage = null;
  downFrameCount = 0;
  upFrameCount = 0;
  document.getElementById("mode-text").textContent =
    ["", "스쿼트 모드", "런지 모드", "사이드암 모드, 암컬 모드"][mode];
}

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  return angle > 180 ? 360 - angle : angle;
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

  const lm = results.poseLandmarks.map(p => ({
    ...p,
    x: 1.0 - p.x
  }));

  drawConnectors(ctx, lm, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
  drawLandmarks(ctx, lm, { color: "#FF0000", lineWidth: 1, radius: 2 });

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "yellow";

  let angle;

  if (currentMode === 1) {
    // 스쿼트 개선
    if (
      isLandmarkVisible(lm, 24) && isLandmarkVisible(lm, 26) && isLandmarkVisible(lm, 28)
    ) {
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
  if (isLandmarkVisible(lm, 24) && isLandmarkVisible(lm, 26)) {
    const hipY = lm[24].y;
    const kneeY = lm[26].y;
    const deltaY = hipY - kneeY;

    ctx.fillText(`무릎 높이차: ${(deltaY * 100).toFixed(1)}%`, 30, 30);

    if (deltaY > 0.12) { // 무릎이 충분히 올라왔을 때
      downFrameCount++;
      if (downFrameCount > 5) stage = "up";
    } else {
      downFrameCount = 0;
    }

    if (deltaY < 0.05 && stage === "up") { // 다시 내렸을 때 카운트
      upFrameCount++;
      if (upFrameCount > 5) {
        count++;
        stage = "down";
        upFrameCount = 0;
      }
    } else {
      upFrameCount = 0;
    }

    if (stage === "up" && deltaY > 0.12) {
      ctx.fillText("GREAT!", 30, 60);
    }
  }
}


  else if (currentMode === 3) {
    angle = calculateAngle(lm[12], lm[11], lm[13]);
    ctx.fillText(`사이드암 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle > 140) ctx.fillText("GREAT!", 30, 60);
    if (angle < 115) stage = "down";
    if (angle > 140 && stage === "down") { count++; stage = "up"; }
  }

  //암컬
  else if (currentMode === 4) {
  if (
    isLandmarkVisible(lm, 12) && isLandmarkVisible(lm, 14) && isLandmarkVisible(lm, 16)
  ) {
    // 오른쪽 팔 기준
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
