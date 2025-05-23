let currentMode = 1;
let count = 0;  // 횟수 카운트 변수
let previousAngle = 0;  // 이전 각도 값 (변경된 각도 여부 추적)
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
    ["스쿼트 모드", "암컬 모드", "사이드암 모드", "크로스 토터치 모드","킥백 모드"][mode];
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

  // 비디오 해상도 기준으로 canvas 사이즈 동기화
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

  // ✅ 랜드마크 좌표도 좌우 반전
  const flippedLandmarks = results.poseLandmarks.map(p => ({
    ...p,
    x: 1.0 - p.x  // 좌우 반전
  }));

/*   // 2. 얼굴 랜드마크 제외하고 그리기
  const faceIndices = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const landmarksToDraw = flippedLandmarks.map((p, i) =>
    faceIndices.has(i) ? null : p
  ).filter(p => p !== null); */

  drawConnectors(ctx, flippedLandmarks, POSE_CONNECTIONS,
    { color: "#00FF00", lineWidth: 3 });
  drawLandmarks(ctx, flippedLandmarks, {
      color: "#FF0000",
      lineWidth: 1,    // 선 얇게
      radius: 2        // 점 작게 (기본은 5 정도)
   });

  
  const lm = flippedLandmarks; // 좌우 반전된 랜드마크 기준
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

  else if (currentMode === 4) {

    leftToRightFoot = calculateDistance(lm[15], lm[28]);   // 왼손 - 오른발
    rightToLeftFoot = calculateDistance(lm[16], lm[27]);   // 오른손 - 왼발

    ctx.fillText(`왼손-오른발: ${leftToRightFoot.toFixed(1)}`, 30, 30);
    ctx.fillText(`오른손-왼발: ${rightToLeftFoot.toFixed(1)}`, 30, 50);

    if(leftToRightFoot<0.2||rightToLeftFoot<0.2) ctx.fillText("GREAT!",30,80);

    if (side === "left") {
      if (leftToRightFoot < 0.2) {
        stage = "down-left";
      }
      if (leftToRightFoot > 0.35 && stage === "down-left") {
        stage = "up-left";
        side = "right";  // 다음은 오른손
      }
    } else if (side === "right") {
      if (rightToLeftFoot < 0.2) {
        stage = "down-right";
      }
      if (rightToLeftFoot > 0.35 && stage === "down-right") {
        stage = "up-right";
        side = "left";  // 다시 왼손
        count++;        // 왼오-오왼 완료 → 카운트 증가
      }
    }
  }

  else if (currentMode === 5) {
    angle = calculateAngle(lm[24], lm[26], lm[28]); // 킥백 (엉덩이-무릎-발목)
    ctx.fillText(`킥백 각도: ${Math.round(angle)}°`, 30, 30);
    if (angle < 110) stage = "down";
    if (angle > 150 && stage === "down") {
      count++;
      stage = "up";
      ctx.fillText("굿!", 30, 60);
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
