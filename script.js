let currentMode = 1;
let count = 0;
let previousAngle = 0;
let stage = null;
let downFrameCount = 0;
let upFrameCount = 0;
let side = "left";

let countMode = "infinite";
let targetCount = 0;

let trackingStarted = false;

function setMode(mode) {
  currentMode = mode;
  count = 0;
  stage = null;
  downFrameCount = 0;
  upFrameCount = 0;
  document.getElementById("mode-text").textContent =
    ["", "스쿼트 모드", "암컬 모드", "사이드암 모드", "크로스 토터치 모드"][mode];
}

//카운트 모드인지 확인
function setCountMode(countingType) {
  countMode = countingType;
  if (countingType === "limited") {
    const input = document.getElementById("target-count");
    targetCount = parseInt(input.value) || 0;
  }
}

//카운트가 끝날시 리셋을 해주는 함수
function resetCounter() {
  count = 0;
  stage = null;
  downFrameCount = 0;
  upFrameCount = 0;
  side = "left";
  trackingStarted = false;
  document.getElementById("count-display").textContent = `현재 횟수: ${count}`;
  document.getElementById("success-box").textContent = "";
}

//카운트 모드 성공시 성공표시함수
function checkSuccess() {
  if (countMode === "limited" && count >= targetCount) {
    const box = document.getElementById("success-box");
    box.textContent = "SUCCESS!";
    box.style.color = "green";

    // ✔️ 자동 초기화
    setTimeout(() => {
      resetCounter();
    }, 2000); // 2초 후 초기화

    return true;
  }
  return false;
}

function showFeedbackMessage(ctx, message, canvas) {
  ctx.font = "bold 60px sans-serif";  // 두껍고 크게
  ctx.fillStyle = "yellow";          // 노랑색
  ctx.fillText(message, canvas.width / 2, 70);  // 중앙 위쪽 (Y=100)
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
    canvas.style.width = `${video.videoWidth}px`;
    canvas.style.height = `${video.videoHeight}px`;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ✅ 비디오 프레임 반전 출력
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (!results.poseLandmarks) return;

  // ✅ 랜드마크 좌표 반전
  const flippedLandmarks = results.poseLandmarks.map(p => ({
    ...p,
    x: 1.0 - p.x
  }));

  const faceIndices = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const landmarksWithoutFace = flippedLandmarks.map((p, i) =>
    faceIndices.has(i) ? null : p
  ).filter(p => p !== null);

  const filteredConnections = POSE_CONNECTIONS.filter(([start, end]) =>
    !faceIndices.has(start) && !faceIndices.has(end)
  );

  drawConnectors(ctx, flippedLandmarks, filteredConnections, {
    color: "#00FF00",
    lineWidth: 3
  });

  drawLandmarks(ctx, landmarksWithoutFace, {
    color: "#FF0000",
    lineWidth: 1,
    radius: 2
  });

  const lm = flippedLandmarks;
  ctx.font = "50px sans-serif";
  ctx.fillStyle = "blue";

  let angle;

  if (countMode === "infinite" || (countMode === "limited" && trackingStarted)){
    if (currentMode === 1) {
      if (isLandmarkVisible(lm, 24) && isLandmarkVisible(lm, 26) && isLandmarkVisible(lm, 28)) {
        angle = calculateAngle(lm[24], lm[26], lm[28]);
        if (angle > 30 && angle < 160) {
          ctx.fillText(`스쿼트 각도: ${Math.round(angle)}°`, 40, 60);
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
              checkSuccess();
            }
          } else {
            upFrameCount = 0;
          }
          if(angle < 75 && stage === "down") showFeedbackMessage(ctx, "너무 깊이 앉았어요!", canvas);
          if(angle >= 80 && angle <= 95) showFeedbackMessage(ctx, "GREAT!", canvas);
          if(angle > 95 && stage === "down") showFeedbackMessage(ctx, "더 앉으세요!", canvas);
        }
      }
    // 각도 수정
    } 
    else if (currentMode === 2) {
      angle = calculateAngle(lm[12], lm[14], lm[16]);
      if (angle > 30 && angle < 170) {
        ctx.fillText(`암컬 각도: ${Math.round(angle)}°`, 40, 60);
        if (angle < 55) {
          downFrameCount++;
          if (downFrameCount > 5) stage = "up"; //굽힐때 down
        } else {
          downFrameCount = 0;
        }
        if (angle > 85 && stage === "up") {
          upFrameCount++;
          if (upFrameCount > 5) {
            count++;
            stage = "down";
            upFrameCount = 0;
            checkSuccess();
          }
        } else {
          upFrameCount = 0;
        }
        if(angle > 55 && angle < 80 && stage === "down") showFeedbackMessage(ctx, "팔을 더 구부리세요!", canvas);
        if(angle < 55) showFeedbackMessage(ctx, "GREAT!", canvas);
      }
    } 
    else if (currentMode === 3) {
      angle = calculateAngle(lm[12], lm[11], lm[13]);
      ctx.fillText(`사이드암 각도: ${Math.round(angle)}°`, 40, 60);
      if (angle < 115) stage = "down";
      if (angle > 140 && stage === "down") {
        count++;
        stage = "up";
        checkSuccess();
      }
      if(angle > 115 && angle < 140 && stage === "down") showFeedbackMessage(ctx, "팔을 더 올리세요!", canvas);
      if(angle > 140) showFeedbackMessage(ctx, "GREAT!", canvas);
    } 
    else if (currentMode === 4) {
      const leftToRightFoot = calculateDistance(lm[15], lm[28]);
      const rightToLeftFoot = calculateDistance(lm[16], lm[27]);
      ctx.fillText(`왼손-오른발: ${leftToRightFoot.toFixed(1)}`, 40, 60);
      ctx.fillText(`오른손-왼발: ${rightToLeftFoot.toFixed(1)}`, 40, 130);
      if (side === "left") {
        if (leftToRightFoot < 0.2) stage = "down-left";
        if (leftToRightFoot > 0.4 && stage === "down-left") {
          stage = "up-left";
          side = "right";
        }
      } else if (side === "right") {
        if (rightToLeftFoot < 0.2) stage = "down-right";
        if (rightToLeftFoot > 0.4 && stage === "down-right") {
          stage = "up-right";
          side = "left";
          count++;
          checkSuccess();
        }
      }
      if(((rightToLeftFoot < 0.35 && rightToLeftFoot > 0.2) || (leftToRightFoot < 0.35 && leftToRightFoot >0.2))
         && (stage === "down-right" || stage === "down-left")) showFeedbackMessage(ctx, "팔을 더 뻗으세요!", canvas);
      if(leftToRightFoot < 0.2 || rightToLeftFoot < 0.2) showFeedbackMessage(ctx, "GREAT!", canvas);
    }

    document.getElementById("count-display").textContent = `현재 횟수: ${count}`;
  }
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
    const container = document.getElementById("video-container");
  
    // 실제 그릴 해상도는 비디오 해상도로 유지
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  
    // 시각적으로 보이는 크기는 container 기준
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
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

//카운트 시작 버튼
const countStartBtn = document.getElementById("count-start-button");
countStartBtn.addEventListener("click", () => {
  if (countMode === "limited") {
    const input = document.getElementById("target-count");
    targetCount = parseInt(input.value) || 0;

    if (targetCount <= 0) {
      alert("목표 횟수를 1 이상으로 입력하세요.");
      return;
    }
  resetCounter();
  trackingStarted = true;
  }
});