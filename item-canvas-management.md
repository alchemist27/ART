⏺ ---
  📋 아이템 추가/삭제/복제 로직 - 시나리오별 완전 정리

  ---
  🔵 추가(ADD) 시나리오

  📌 시나리오 1: 왼쪽 패널에서 제품 클릭

  흐름도:
  [왼쪽 제품 클릭]
      ↓
  [filter-manager.js] addItemToCanvas() 호출
      ↓
  [canvas-manager.js:270] addItem(itemData) 호출
      ↓
  [Fabric.js] Image.fromURL() - 이미지 로드
      ↓
  [canvas-manager.js:316] canvas.add(img) 실행
      ↓
  [이벤트 트리거] 'object:added'
      ↓
  [canvas-manager.js:227-231] 이벤트 핸들러
      ├─ saveState() → 히스토리에 저장 (Undo/Redo용)
      └─ updateUI()
          └─ updateSelectedItems() → 오른쪽 "구매 예정 아이템" 목록 갱신

  코드:
  // canvas-manager.js:270-326
  addItem(itemData) {
      return new Promise((resolve, reject) => {
          fabric.Image.fromURL(imagePath, (img) => {
              // 1. 크기 계산 (sizeInMM 또는 기본 크기)
              let scale = ...;

              // 2. 캔버스 중앙에 배치
              img.set({
                  left: this.canvas.width / 2,
                  top: this.canvas.height / 2,
                  scaleX: scale,
                  scaleY: scale,
                  originX: 'center',
                  originY: 'center',
              });

              // 3. itemData 저장 (중요!)
              img.itemData = itemData;

              // 4. 캔버스에 추가
              this.canvas.add(img).setActiveObject(img);

              resolve(img);
          });
      });
  }

  결과:
  - ✅ 캔버스 중앙에 이미지 추가
  - ✅ object:added 이벤트 자동 발생
  - ✅ 히스토리 저장 (Undo 가능)
  - ✅ 오른쪽 구매 예정 목록에 자동 추가/수량+1

  ---
  📌 시나리오 2: 오른쪽 패널 "수량 증가(+)" 버튼 클릭

  흐름도:
  [오른쪽 패널 + 버튼 클릭]
      ↓
  [canvas-manager.js:694] increaseBtn.onclick
      ↓
  [canvas-manager.js:697] this.addItem(itemData) 호출
      ↓
  (시나리오 1과 동일한 흐름)

  코드:
  // canvas-manager.js:690-698
  const increaseBtn = document.createElement('button');
  increaseBtn.onclick = (e) => {
      e.stopPropagation();
      this.addItem(itemData); // 동일한 제품 추가
  };

  결과:
  - ✅ 동일 제품이 캔버스 중앙에 추가됨
  - ✅ 오른쪽 목록의 해당 제품 수량 +1

  특징:
  - 기존 제품 위치와 무관하게 항상 중앙에 추가
  - 사용자가 원하는 위치로 직접 드래그 필요

  ---
  📌 시나리오 3: 오른쪽 패널 "수량 입력 필드"에서 직접 수량 증가

  흐름도:
  [수량 입력 필드] 3 → 5로 변경
      ↓
  [canvas-manager.js:664] quantityInput.onchange
      ↓
  [diff = 2 계산] (5 - 3)
      ↓
  [for 루프 2번]
      ├─ this.addItem(itemData) 1회
      └─ this.addItem(itemData) 2회
      ↓
  (각각 시나리오 1 흐름)

  코드:
  // canvas-manager.js:664-688
  quantityInput.onchange = (e) => {
      const newQuantity = parseInt(e.target.value);
      const currentQuantity = groupObjects.length;

      if (newQuantity > currentQuantity) {
          // 수량 증가: 새 객체 추가
          const diff = newQuantity - currentQuantity;
          for (let i = 0; i < diff; i++) {
              this.addItem(itemData); // Promise 반환하지만 await 안 함
          }
      }
  };

  결과:
  - ✅ 차이만큼 캔버스에 이미지 추가 (각각 중앙)
  - ✅ 각 추가마다 object:added 이벤트 발생
  - ✅ 오른쪽 목록 수량 자동 갱신

  ⚠️ 주의사항:
  - addItem()은 비동기(Promise)지만 await 없이 반복 호출
  - 이미지 로딩 순서가 보장되지 않을 수 있음
  - 빠르게 여러 개 추가 시 UI 갱신이 여러 번 발생 (성능 영향)

  ---
  🔴 삭제(DELETE) 시나리오

  📌 시나리오 4: 캔버스 객체의 빨간색 X 버튼 클릭

  흐름도:
  [캔버스 위 객체 선택] → 빨간색 X 버튼 클릭
      ↓
  [canvas-manager.js:114] deleteControl.mouseUpHandler
      ↓
  [canvas-manager.js:117] canvas.remove(target)
      ↓
  [이벤트 트리거] 'object:removed'
      ↓
  [canvas-manager.js:233-237] 이벤트 핸들러
      ├─ saveState() → 히스토리 저장
      └─ updateUI() → 구매 예정 목록 갱신

  코드:
  // canvas-manager.js:107-148
  fabric.Object.prototype.controls.deleteControl = new fabric.Control({
      x: -0.5, y: -0.5,
      offsetX: -16, offsetY: -16,
      mouseUpHandler: (eventData, transform) => {
          const target = transform.target;
          const canvas = target.canvas;
          canvas.remove(target);  // 삭제
          canvas.requestRenderAll();
          return true;
      },
      // ... 빨간색 원에 X 아이콘 렌더링
  });

  결과:
  - ✅ 선택한 객체 1개만 캔버스에서 제거
  - ✅ 오른쪽 목록에서 수량 -1 (또는 완전 제거)
  - ✅ Undo 가능

  ---
  📌 시나리오 5: Delete/Backspace 키 누름 (단일 선택)

  흐름도:
  [객체 1개 선택] → Delete 키
      ↓
  [canvas-manager.js:434] handleKeyDown() → deleteSelected() 호출
      ↓
  [canvas-manager.js:428-449] deleteSelected()
      ↓
  [objects.length === 1 확인]
      ↓
  [단일 객체 삭제 경로]
      ├─ canvas.remove(objects[0])
      └─ object:removed 이벤트 자동 트리거
          ├─ saveState()
          └─ updateUI()

  코드:
  // canvas-manager.js:428-449
  deleteSelected() {
      const objects = this.canvas.getActiveObjects();
      if (objects.length === 0) return;

      if (objects.length > 1) {
          // 다중 삭제 경로 (시나리오 6)
      } else {
          // 단일 객체는 일반 삭제 (이벤트 자동 트리거)
          this.canvas.remove(objects[0]);
          this.canvas.discardActiveObject().renderAll();
      }
  }

  결과:
  - ✅ 선택한 객체 삭제
  - ✅ 자동 이벤트 트리거로 히스토리 저장 & UI 갱신

  ---
  📌 시나리오 6: Shift+클릭으로 다중 선택 후 Delete 키 (최적화됨!)

  흐름도:
  [Shift+클릭으로 5개 선택] → Delete 키
      ↓
  [canvas-manager.js:428-449] deleteSelected()
      ↓
  [objects.length > 1 확인] → 다중 삭제 경로
      ↓
  [이벤트 일시 정지] isLoadingState = true
      ↓
  [for each 5회] canvas.remove(obj) ← 이벤트 발생 안 함!
      ↓
  [렌더링] canvas.renderAll()
      ↓
  [이벤트 재개] isLoadingState = false
      ↓
  [수동 호출]
      ├─ saveState() → 히스토리 1회만 저장
      └─ updateUI() → UI 1회만 갱신

  코드:
  // canvas-manager.js:434-443
  if (objects.length > 1) {
      this.isLoadingState = true;  // 🔥 이벤트 차단

      objects.forEach(obj => this.canvas.remove(obj));
      this.canvas.discardActiveObject().renderAll();

      // 이벤트 재개 후 한 번만 업데이트
      this.isLoadingState = false;
      this.saveState();  // 1회
      this.updateUI();   // 1회
  }

  효과:
  - ✅ 성능 최적화: 10개 삭제 시 updateUI() 10회 → 1회
  - ✅ 브라우저 부하 감소: DOM 재렌더링 최소화
  - ✅ 히스토리 정확성: 한 번의 작업으로 기록
  - ✅ Undo 정상 작동: Ctrl+Z로 10개 모두 복원

  ---
  📌 시나리오 7: 오른쪽 패널 "모두 삭제(X)" 버튼 클릭

  흐름도:
  [오른쪽 패널 X 버튼] (그룹 5개)
      ↓
  [canvas-manager.js:708] deleteBtn.onclick
      ↓
  [groupObjects.length > 1 확인] → 다중 삭제 경로
      ↓
  [이벤트 일시 정지] isLoadingState = true
      ↓
  [for each 5회] canvas.remove(obj)
      ↓
  [이벤트 재개]
      ├─ saveState()
      └─ updateUI()

  코드:
  // canvas-manager.js:708-730
  deleteBtn.onclick = (e) => {
      e.stopPropagation();

      if (groupObjects.length > 1) {
          this.isLoadingState = true;

          groupObjects.forEach(obj => this.canvas.remove(obj));
          this.canvas.renderAll();

          this.isLoadingState = false;
          this.saveState();
          this.updateUI();
      } else {
          // 단일 객체는 일반 삭제
          this.canvas.remove(groupObjects[0]);
          this.canvas.renderAll();
      }
  };

  결과:
  - ✅ 해당 제품의 모든 인스턴스 캔버스에서 삭제
  - ✅ 오른쪽 목록에서 완전 제거
  - ✅ 다중 삭제 최적화 적용

  ---
  📌 시나리오 8: 오른쪽 패널 "수량 감소(-)" 버튼 클릭

  흐름도:
  [오른쪽 패널 - 버튼] (수량 3개)
      ↓
  [canvas-manager.js:648] decreaseBtn.onclick
      ↓
  [groupObjects.length > 1 확인]
      ↓
  [마지막 객체 제거] lastObj = groupObjects[2]
      ↓
  canvas.remove(lastObj)
      ↓
  object:removed 이벤트 → 자동 히스토리 저장 & UI 갱신

  코드:
  // canvas-manager.js:644-656
  decreaseBtn.onclick = (e) => {
      e.stopPropagation();
      if (groupObjects.length > 1) {
          const lastObj = groupObjects[groupObjects.length - 1];
          this.canvas.remove(lastObj);
          this.canvas.renderAll();
      }
  };

  결과:
  - ✅ 가장 최근에 추가된 객체 1개만 삭제
  - ✅ 오른쪽 목록 수량 -1

  ---
  📌 시나리오 9: 오른쪽 패널 수량 입력 필드에서 감소 (다중)

  흐름도:
  [수량 입력] 5 → 2로 변경
      ↓
  [canvas-manager.js:676] quantityInput.onchange
      ↓
  [diff = 3 계산] (5 - 2)
      ↓
  [diff > 1 확인] → 다중 삭제 최적화
      ↓
  [이벤트 일시 정지] isLoadingState = true
      ↓
  [for 루프 3회] canvas.remove(lastObj)
      ↓
  [이벤트 재개] saveState() + updateUI()

  코드:
  // canvas-manager.js:676-701
  else if (newQuantity < currentQuantity) {
      const diff = currentQuantity - newQuantity;

      if (diff > 1) {
          // 다중 삭제 시 성능 최적화
          this.isLoadingState = true;

          for (let i = 0; i < diff; i++) {
              const lastObj = groupObjects[groupObjects.length - 1 - i];
              this.canvas.remove(lastObj);
          }

          this.canvas.renderAll();

          this.isLoadingState = false;
          this.saveState();
          this.updateUI();
      } else {
          // 단일 삭제는 일반 처리
          const lastObj = groupObjects[groupObjects.length - 1];
          this.canvas.remove(lastObj);
          this.canvas.renderAll();
      }
  }

  결과:
  - ✅ 차이만큼 캔버스에서 제거
  - ✅ 2개 이상 감소 시 성능 최적화 적용
  - ✅ 1개만 감소 시 일반 이벤트 흐름

  ---
  🟢 복제(DUPLICATE) 시나리오

  📌 시나리오 10: 캔버스 객체의 초록색 + 버튼 클릭

  흐름도:
  [캔버스 위 객체 선택] → 초록색 + 버튼 클릭
      ↓
  [canvas-manager.js:157] cloneControl.mouseUpHandler
      ↓
  [Fabric.js] target.clone() 호출
      ↓
  [canvas-manager.js:162-164] itemData 깊은 복사 ⭐ NEW!
      ↓
  [위치 설정] left+20, top+20
      ↓
  canvas.add(cloned)
      ↓
  object:added 이벤트 → 자동 히스토리 & UI 갱신

  코드:
  // canvas-manager.js:151-177
  fabric.Object.prototype.controls.cloneControl = new fabric.Control({
      mouseUpHandler: (eventData, transform) => {
          const target = transform.target;
          const canvas = target.canvas;

          target.clone(cloned => {
              // ⭐ itemData 깊은 복사 (참조 문제 방지)
              if (cloned.itemData) {
                  cloned.itemData = JSON.parse(JSON.stringify(cloned.itemData));
              }

              cloned.set({
                  left: target.left + 20,
                  top: target.top + 20,
              });
              canvas.add(cloned);
              canvas.setActiveObject(cloned);
          });

          return true;
      },
  });

  결과:
  - ✅ 원본 오른쪽 아래 20px 오프셋에 복제본 생성
  - ✅ itemData가 독립적으로 복사됨 (원본과 참조 공유 안 함)
  - ✅ 오른쪽 목록 수량 +1

  ---
  📌 시나리오 11: 상단 "복제" 버튼 클릭

  흐름도:
  [객체 선택] → 상단 복제 버튼 클릭
      ↓
  [canvas-manager.js:758] duplicate() 호출
      ↓
  activeObject.clone()
      ↓
  [canvas-manager.js:763-765] itemData 깊은 복사 ⭐ NEW!
      ↓
  [위치 설정] left+20, top+20
      ↓
  canvas.add(cloned) → object:added 이벤트

  코드:
  // canvas-manager.js:758-774
  duplicate() {
      const activeObject = this.canvas.getActiveObject();
      if (activeObject) {
          activeObject.clone(cloned => {
              // ⭐ itemData 깊은 복사 (참조 문제 방지)
              if (cloned.itemData) {
                  cloned.itemData = JSON.parse(JSON.stringify(cloned.itemData));
              }

              cloned.set({
                  left: activeObject.left + 20,
                  top: activeObject.top + 20,
              });
              this.canvas.add(cloned).setActiveObject(cloned);
          });
      }
  }

  결과:
  - ✅ 시나리오 10과 동일
  - ✅ itemData 깊은 복사로 원본과 독립적

  ---
  🎯 핵심 이벤트 흐름 정리

  ⚙️ 자동 이벤트 트리거 구조

  // canvas-manager.js:225-250
  setupEventListeners() {
      this.canvas.on({
          'object:added': () => {
              if (!this.isLoadingState) {  // 🔥 플래그 체크
                  this.saveState();        // 히스토리 저장
                  this.updateUI();         // UI 갱신
              }
          },
          'object:removed': () => {
              if (!this.isLoadingState) {  // 🔥 플래그 체크
                  this.saveState();
                  this.updateUI();
              }
          },
          'object:modified': () => !this.isLoadingState && this.saveState(),
          'selection:created': (e) => {
              this.updateUI();
              this.highlightSelectedItemInList(e.selected[0]);
          },
          'selection:updated': (e) => {
              this.updateUI();
              this.highlightSelectedItemInList(e.selected[0]);
          },
          'selection:cleared': () => {
              this.updateUI();
              this.clearItemListHighlight();
          },
      });
  }

  🔥 isLoadingState 플래그의 역할

  | 상황             | isLoadingState | 효과                                    |
  |----------------|----------------|---------------------------------------|
  | 일반 추가/삭제       | false          | 이벤트 자동 트리거 → saveState() + updateUI() |
  | 다중 삭제 중        | true           | 이벤트 차단 → 반복 호출 방지                     |
  | 다중 삭제 완료 후     | false로 복원      | 수동으로 saveState() + updateUI() 1회 호출   |
  | Undo/Redo 복원 중 | true           | 히스토리 중복 저장 방지                         |

  ---
  📊 시나리오별 비교표

  | 시나리오             | 트리거    | 이벤트              | 히스토리    | UI 갱신   | 성능 최적화   |
  |------------------|--------|------------------|---------|---------|----------|
  | 1. 왼쪽 패널 제품 클릭   | 사용자 클릭 | object:added     | ✅ 자동    | ✅ 자동    | -        |
  | 2. 오른쪽 + 버튼      | 버튼 클릭  | object:added     | ✅ 자동    | ✅ 자동    | -        |
  | 3. 수량 증가 입력      | 입력 변경  | object:added × N | ✅ N회    | ✅ N회    | ❌ 최적화 필요 |
  | 4. 캔버스 X 버튼      | 컨트롤 클릭 | object:removed   | ✅ 자동    | ✅ 자동    | -        |
  | 5. Delete 키 (단일) | 키보드    | object:removed   | ✅ 자동    | ✅ 자동    | -        |
  | 6. Delete 키 (다중) | 키보드    | ❌ 차단됨            | ✅ 수동 1회 | ✅ 수동 1회 | ✅ 최적화됨   |
  | 7. 오른쪽 X 버튼 (다중) | 버튼 클릭  | ❌ 차단됨            | ✅ 수동 1회 | ✅ 수동 1회 | ✅ 최적화됨   |
  | 8. 오른쪽 - 버튼      | 버튼 클릭  | object:removed   | ✅ 자동    | ✅ 자동    | -        |
  | 9. 수량 감소 입력 (다중) | 입력 변경  | ❌ 차단됨            | ✅ 수동 1회 | ✅ 수동 1회 | ✅ 최적화됨   |
  | 10. 캔버스 + 버튼     | 컨트롤 클릭 | object:added     | ✅ 자동    | ✅ 자동    | -        |
  | 11. 상단 복제 버튼     | 버튼 클릭  | object:added     | ✅ 자동    | ✅ 자동    | -        |

  ---
  🔄 동기화 메커니즘

  캔버스 ↔ 구매 예정 아이템 목록

  [캔버스 변화]
      ↓
  [object:added/removed 이벤트]
      ↓
  [updateUI() 호출]
      ↓
  [updateSelectedItems() 실행]
      ↓
  1. canvas.getObjects() - 모든 객체 가져오기
  2. groupItemsByType() - 동일 제품 그룹화
  3. isSameItem() - id + selectedSize로 비교
  4. DOM 재생성 - 오른쪽 목록 렌더링





   ---
  📊 제품 관리 3대 포인트 동기화 표

  | 작업                              | 제품목록 (왼쪽 패널) | 캔버스 (중앙)                                            | 구매예정아이템 (오른쪽 패널)           | 이벤트 흐름
                                    |
  |---------------------------------|--------------|-----------------------------------------------------|----------------------------|-----------------------------------------
  --|
  | 제품 추가                           |              |                                                     |                            |
        |
  | 제품목록 클릭                         | 클릭한 제품 선택    | ✅ 캔버스 중앙에 이미지 추가addItem(itemData)img.itemData 저장    | ✅ 자동 추가/수량+1동일 제품이면 그룹화
   | object:added → saveState() + updateUI()   |
  | 구매예정 + 버튼                       | 변화 없음        | ✅ 캔버스 중앙에 이미지 추가addItem(itemData)                   | ✅ 해당 제품 수량+1               |
  object:added → saveState() + updateUI()   |
  | 구매예정 수량 입력 증가(3→5)              | 변화 없음        | ✅ 2개 추가 (각각 중앙)addItem() 2회 반복                      | ✅ 수량 5로 표시                 |
  object:added × 2회 → 각각 자동 갱신              |
  | 캔버스 + 버튼 (복제)                   | 변화 없음        | ✅ 원본 우측 하단에 복제clone() + itemData 깊은 복사              | ✅ 해당 제품 수량+1               |
  object:added → saveState() + updateUI()   |
  | 상단 복제 버튼                        | 변화 없음        | ✅ 선택 객체 복제duplicate() + itemData 깊은 복사              | ✅ 해당 제품 수량+1               | object:added
   → saveState() + updateUI()   |
  | 수량 수정                           |              |                                                     |                            |
        |
  | 구매예정 수량 입력 감소(5→3, 단일)          | 변화 없음        | ✅ 가장 최근 객체 1개 제거canvas.remove(lastObj)              | ✅ 수량 4로 표시                 |
  object:removed → saveState() + updateUI() |
  | 구매예정 수량 입력 감소(5→2, 다중)          | 변화 없음        | ✅ 최근 객체 3개 제거isLoadingState=true이벤트 차단 후 일괄 삭제      | ✅ 수량 2로 표시1회만 갱신
    | 이벤트 차단 → 수동 saveState() + updateUI() 1회   |
  | 구매예정 - 버튼                       | 변화 없음        | ✅ 가장 최근 객체 1개 제거                                    | ✅ 수량 -1                    | object:removed →
  saveState() + updateUI() |
  | 삭제                              |              |                                                     |                            |
      |
  | 캔버스 X 버튼 (빨간색)                  | 변화 없음        | ✅ 선택한 객체 1개 제거canvas.remove(target)                 | ✅ 해당 제품 수량-1마지막이면 목록에서 제거  |
  object:removed → saveState() + updateUI() |
  | Delete/Backspace 키(단일 선택)       | 변화 없음        | ✅ 선택한 객체 1개 제거deleteSelected()                      | ✅ 해당 제품 수량-1               | object:removed
  → saveState() + updateUI() |
  | Delete/Backspace 키(Shift+다중 선택) | 변화 없음        | ✅ 선택한 모든 객체 제거isLoadingState=true이벤트 차단 후 일괄 삭제     | ✅ 각 제품 수량 차감1회만 갱신         |
   이벤트 차단 → 수동 saveState() + updateUI() 1회   |
  | 구매예정 X 버튼(단일 제품)                | 변화 없음        | ✅ 해당 객체 1개 제거                                       | ✅ 해당 제품 수량-1마지막이면 제거       |
  object:removed → saveState() + updateUI() |
  | 구매예정 X 버튼(그룹 전체 삭제)             | 변화 없음        | ✅ 해당 제품 모든 인스턴스 제거isLoadingState=true이벤트 차단 후 일괄 삭제 | ✅ 해당 제품 목록에서 완전
  제거1회만 갱신   | 이벤트 차단 → 수동 saveState() + updateUI() 1회   |
  | 상단 삭제 버튼                        | 변화 없음        | ✅ 선택한 객체(들) 제거다중이면 성능 최적화 적용                        | ✅ 해당 제품(들) 수량 차감           |
  단일: 자동 이벤트다중: 수동 1회 갱신                    |
  | 상단 초기화 버튼                       | 변화 없음        | ✅ 확인 대화상자 후모든 객체 제거canvas.clear()                   | ✅ 목록 완전 초기화"추가된 아이템 없음" 표시
   | clear() → saveState() + updateUI()        |

  ---
  🔑 핵심 메커니즘

  1️⃣ 자동 동기화 구조

  캔버스 변화 (add/remove)
      ↓
  object:added / object:removed 이벤트 자동 발생
      ↓
  if (!isLoadingState) {
      saveState();    // 히스토리 저장 (Undo/Redo)
      updateUI();     // 구매예정아이템 목록 갱신
  }

  2️⃣ 다중 작업 최적화 (성능 개선)

  다중 삭제/수정 시작
      ↓
  isLoadingState = true  // 🔥 이벤트 차단
      ↓
  반복 작업 (이벤트 발생 안 함)
      ↓
  isLoadingState = false
      ↓
  saveState() + updateUI() 1회만 호출  // ✅ 성능 최적화

  3️⃣ 구매예정아이템 그룹화 로직

  updateSelectedItems()
      ↓
  1. canvas.getObjects() - 모든 객체 가져오기
      ↓
  2. groupItemsByType() - 동일 제품 찾기
      ↓
  3. isSameItem() 비교
     - id + selectedSize 동일 → 같은 제품
     - name + src 동일 → 같은 제품
      ↓
  4. 그룹별 수량 계산 및 DOM 렌더링

  ---
  ⚡ 성능 최적화 적용 케이스

  | 케이스                   | 최적화 여부 | 이유                         |
  |-----------------------|--------|----------------------------|
  | 제품 1개 추가              | ❌      | 자동 이벤트로 충분                 |
  | 제품 5개 연속 추가 (수량 입력)   | ❌      | 각각 Promise로 비동기 처리         |
  | 제품 1개 삭제              | ❌      | 자동 이벤트로 충분                 |
  | 제품 2개 이상 동시 삭제        | ✅      | isLoadingState 플래그로 이벤트 차단 |
  | Shift+10개 선택 후 Delete | ✅      | updateUI() 10회 → 1회        |
  | 수량 5→2 감소 (3개 삭제)     | ✅      | isLoadingState 플래그로 최적화    |

  ---
  🔄 양방향 동기화 보장

  제품목록 → 캔버스 → 구매예정아이템 (단방향)
           ↑         ↓
           └─────────┘ (object:added/removed 이벤트로 자동 동기화)

  구매예정아이템 → 캔버스 → 구매예정아이템 (순환)
                ↓         ↑
           (수량 조절)   (이벤트 트리거)

  결과: 어디서든 변경해도 3개 영역이 완벽하게 동기화됨!