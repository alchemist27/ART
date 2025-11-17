/**
 * Canvas Manager - 캔버스 렌더링 및 객체 관리
 */
class CanvasManager {
    constructor(canvasId) {
        this.canvas = null;
        this.canvasId = canvasId;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.currentBackground = null;
        this.watermarkImage = null;
        this.resizeTimer = null;
        this.isLoadingState = false; // 상태 로딩 중 플래그
        this.zoomLevel = 1; // 현재 줌 레벨 (1 = 100%)
        this.minZoom = 0.5; // 최소 줌 (50%)
        this.maxZoom = 2; // 최대 줌 (200%)
        this.zoomStep = 0.1; // 줌 단계 (10%)

        this.init();
    }
    
    init() {
        // Fabric.js 캔버스 초기화 - 더 큰 작업 영역
        this.canvas = new fabric.Canvas(this.canvasId, {
            width: 1400,
            height: 1000,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
        });
        
        // 전역 컨트롤 설정
        this.setupGlobalControls();
        
        // 캔버스 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 캔버스 크기 및 정렬 설정
        this.setupCanvasLayout();

        // Zoom 컨트롤 설정
        this.setupZoomControls();

        // 초기 히스토리 저장
        this.saveState();
    }
    
    setupGlobalControls() {
        // 회전 핸들러 커스터마이징
        fabric.Object.prototype.controls.mtr = new fabric.Control({
            x: 0,
            y: -0.5,
            offsetY: -25,
            cursorStyle: 'crosshair',
            actionHandler: fabric.controlsUtils.rotationWithSnapping,
            actionName: 'rotate',
            render: (ctx, left, top, styleOverride, fabricObject) => {
                const size = 32; // 핸들러 크기
                ctx.save();
                ctx.translate(left, top);
                ctx.rotate(fabricObject.angle * Math.PI / 180);
                // 보라색 원 배경 제거!
                // SVG 아이콘 (viewBox 0 0 24 24)
                ctx.save();
                // 아이콘을 핸들러 크기에 맞게 scale/translate
                const iconSize = 24;
                const scale = size / iconSize * 0.8; // 0.8: 여백
                ctx.scale(scale, scale);
                ctx.translate(-iconSize/2, -iconSize/2);
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                // path 1: M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8
                ctx.beginPath();
                ctx.moveTo(21, 12);
                ctx.bezierCurveTo(21, 7.03, 16.97, 3, 12, 3);
                ctx.bezierCurveTo(9.56, 3, 7.23, 3.93, 5.26, 5.74);
                ctx.lineTo(3, 8);
                ctx.stroke();
                // path 2: M3 3v5h5
                ctx.beginPath();
                ctx.moveTo(3, 3);
                ctx.lineTo(3, 8);
                ctx.lineTo(8, 8);
                ctx.stroke();
                // path 3: M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16
                ctx.beginPath();
                ctx.moveTo(3, 12);
                ctx.bezierCurveTo(3, 16.97, 7.03, 21, 12, 21);
                ctx.bezierCurveTo(14.44, 21, 16.77, 20.07, 18.74, 18.26);
                ctx.lineTo(21, 16);
                ctx.stroke();
                // path 4: M16 16h5v5
                ctx.beginPath();
                ctx.moveTo(16, 16);
                ctx.lineTo(21, 16);
                ctx.lineTo(21, 21);
                ctx.stroke();
                ctx.restore();
                ctx.restore();
            },
            cornerSize: 16,
            withConnection: false
        });

        // 삭제 버튼 (왼쪽 상단)
        fabric.Object.prototype.controls.deleteControl = new fabric.Control({
            x: -0.5,
            y: -0.5,
            offsetX: -16,
            offsetY: -16,
            cursorStyle: 'pointer',
            mouseUpHandler: (eventData, transform) => {
                const target = transform.target;
                const canvas = target.canvas;
                canvas.remove(target);
                canvas.requestRenderAll();
                return true;
            },
            render: (ctx, left, top, styleOverride, fabricObject) => {
                const size = 24;
                ctx.save();
                ctx.translate(left, top);

                // 빨간색 원 배경
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
                ctx.fillStyle = '#ef4444';
                ctx.fill();

                // X 아이콘
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';

                const iconSize = 10;
                ctx.beginPath();
                ctx.moveTo(-iconSize / 2, -iconSize / 2);
                ctx.lineTo(iconSize / 2, iconSize / 2);
                ctx.moveTo(iconSize / 2, -iconSize / 2);
                ctx.lineTo(-iconSize / 2, iconSize / 2);
                ctx.stroke();

                ctx.restore();
            },
            cornerSize: 24
        });

        // 복제 버튼 (오른쪽 상단)
        fabric.Object.prototype.controls.cloneControl = new fabric.Control({
            x: 0.5,
            y: -0.5,
            offsetX: 16,
            offsetY: -16,
            cursorStyle: 'pointer',
            mouseUpHandler: (eventData, transform) => {
                const target = transform.target;
                const canvas = target.canvas;

                target.clone(cloned => {
                    // itemData 깊은 복사 (참조 문제 방지)
                    if (cloned.itemData) {
                        cloned.itemData = JSON.parse(JSON.stringify(cloned.itemData));
                    }

                    cloned.set({
                        left: target.left + 20,
                        top: target.top + 20,
                    });
                    canvas.add(cloned);
                    canvas.setActiveObject(cloned);
                    canvas.requestRenderAll();
                });

                return true;
            },
            render: (ctx, left, top, styleOverride, fabricObject) => {
                const size = 24;
                ctx.save();
                ctx.translate(left, top);

                // 초록색 원 배경
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
                ctx.fillStyle = '#10b981';
                ctx.fill();

                // + 아이콘
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';

                const iconSize = 10;
                ctx.beginPath();
                ctx.moveTo(0, -iconSize / 2);
                ctx.lineTo(0, iconSize / 2);
                ctx.moveTo(-iconSize / 2, 0);
                ctx.lineTo(iconSize / 2, 0);
                ctx.stroke();

                ctx.restore();
            },
            cornerSize: 24
        });

        // 전역 컨트롤 스타일 설정
        fabric.Object.prototype.set({
            cornerStyle: 'circle',
            cornerColor: '#6366f1',
            cornerStrokeColor: '#ffffff',
            borderColor: '#6366f1',
            transparentCorners: false,
            cornerSize: 12,
            rotatingPointOffset: 30,
        });
        
        // 전역 컨트롤 가시성 설정 (크기 조절 핸들러 모두 비활성화)
        fabric.Object.prototype.setControlsVisibility({
            mt: false, mb: false, ml: false, mr: false,
            tl: false, tr: false, bl: false, br: false, // 모서리 크기 조절 비활성화
        });
    }
    
    setupEventListeners() {
        this.canvas.on({
            'object:added': () => {
                if (!this.isLoadingState) {
                    this.saveState();
                    this.updateUI();
                }
            },
            'object:removed': () => {
                if (!this.isLoadingState) {
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

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    setupCanvasLayout() {
        const wrapperEl = this.canvas.wrapperEl;
        if (wrapperEl) {
            wrapperEl.style.borderRadius = 'var(--radius-xl)';
            wrapperEl.style.boxShadow = 'var(--shadow-lg)';
            wrapperEl.style.margin = '0 auto';
        }
        
        // DOM 렌더링이 완료된 후, 캔버스 오프셋을 재계산합니다.
        // 이것이 중앙 정렬된 캔버스의 좌표 문제를 해결하는 핵심입니다.
        setTimeout(() => {
            this.canvas.calcOffset();
            this.canvas.renderAll();
        }, 0);
    }
    
    // 아이템을 캔버스에 추가
    addItem(itemData) {
        return new Promise((resolve, reject) => {
            // Firebase에서 온 데이터의 src 필드 사용
            const imagePath = itemData.src;

            if (!imagePath) {
                console.error('이미지 경로가 없습니다:', itemData);
                return reject(new Error('이미지 경로가 없습니다'));
            }

            fabric.Image.fromURL(imagePath, (img) => {
                if (!img || !img.width) {
                    console.error('이미지 로드 실패:', imagePath);
                    return reject(new Error('이미지 로드 실패'));
                }

                let scale;

                // sizeInMM 값이 있으면 실제 크기로 변환
                if (itemData.sizeInMM && itemData.sizeInMM > 0) {
                    // mm를 픽셀로 변환
                    // 1 inch = 25.4mm
                    // 일반적인 화면 DPI = 96
                    const DPI = 96;
                    const MM_PER_INCH = 25.4;
                    const sizeInPixels = (itemData.sizeInMM / MM_PER_INCH) * DPI;

                    // 이미지의 원본 비율을 유지하면서 크기 조정
                    const maxDimension = Math.max(img.width, img.height);
                    scale = sizeInPixels / maxDimension;
                } else {
                    // 기본 크기 (sizeInMM 값이 없을 때)
                    const maxSize = 100;
                    scale = Math.min(maxSize / img.width, maxSize / img.height);
                }

                img.set({
                    left: this.canvas.width / 2,
                    top: this.canvas.height / 2,
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'center',
                    originY: 'center',
                });

                img.itemData = itemData;
                this.canvas.add(img).setActiveObject(img);

                this.hideWelcomeOverlay();

                // 아이템 추가 후 캔버스 오프셋 재계산
                this.canvas.calcOffset();

                resolve(img);
            }, { crossOrigin: 'anonymous' });
        });
    }

    // 배경 설정
    setBackground(backgroundData) {
        return new Promise((resolve, reject) => {
            // Firebase에서 온 데이터의 src 필드 사용
            const imagePath = backgroundData.src;
            if (!imagePath) {
                console.error('배경 이미지 경로가 없습니다:', backgroundData);
                return reject(new Error('배경 이미지 경로가 없습니다'));
            }
            
            fabric.Image.fromURL(imagePath, (img) => {
                if (!img || !img.width) {
                    console.error('배경 이미지 로드 실패:', imagePath);
                    return reject(new Error('배경 이미지 로드 실패'));
                }

                // 배경 이미지는 800x600 크기로 캔버스 중앙에 배치
                const bgWidth = 800;
                const bgHeight = 600;

                this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas), {
                    scaleX: bgWidth / img.width,
                    scaleY: bgHeight / img.height,
                    left: this.canvas.width / 2,
                    top: this.canvas.height / 2,
                    originX: 'center',
                    originY: 'center'
                });
                this.currentBackground = backgroundData;
                this.hideWelcomeOverlay();

                // 배경 설정 후 캔버스 오프셋 재계산
                setTimeout(() => {
                    this.canvas.calcOffset();
                    this.canvas.renderAll();
                }, 100);

                resolve(img);
            }, { crossOrigin: 'anonymous' });
        });
    }

    saveState() {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(this.canvas.toDatalessJSON());
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
        this.historyIndex = this.history.length - 1;
        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
        }
    }
    
    loadState(state) {
        this.isLoadingState = true;
        this.canvas.loadFromJSON(state, () => {
            this.canvas.renderAll();
            this.isLoadingState = false;
            this.updateUI();
        });
    }
    
    updateHistoryButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
    }
    
    bringToFront() { this.canvas.getActiveObject()?.bringToFront(); this.canvas.renderAll(); }
    sendToBack() { this.canvas.getActiveObject()?.sendToBack(); this.canvas.renderAll(); }
    bringForward() { this.canvas.getActiveObject()?.bringForward(); this.canvas.renderAll(); }
    sendBackwards() { this.canvas.getActiveObject()?.sendBackwards(); this.canvas.renderAll(); }
    
    flipHorizontal() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('flipX', !activeObject.flipX);
            this.canvas.renderAll();
        }
    }

    deleteSelected() {
        const objects = this.canvas.getActiveObjects();

        if (objects.length === 0) return;

        // 다중 선택 삭제 시 성능 최적화
        if (objects.length > 1) {
            this.isLoadingState = true;

            objects.forEach(obj => this.canvas.remove(obj));
            this.canvas.discardActiveObject().renderAll();

            // 이벤트 재개 후 한 번만 업데이트
            this.isLoadingState = false;
            this.saveState();
            this.updateUI();
        } else {
            // 단일 객체는 일반 삭제 (이벤트 자동 트리거)
            this.canvas.remove(objects[0]);
            this.canvas.discardActiveObject().renderAll();
        }
    }
    
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') { e.preventDefault(); this.undo(); }
            if (e.key === 'y') { e.preventDefault(); this.redo(); }
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelected();
        }
    }

    handleWindowResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.canvas.calcOffset();
            this.canvas.renderAll();
        }, 100);
    }
    
    updateUI() {
        this.updateSelectedItems();
        this.updateLayerControls();
        this.updateHistoryButtons();
    }
    
    updateLayerControls() {
        const activeObject = this.canvas.getActiveObject();
        document.querySelectorAll('.layer-btn').forEach(btn => btn.disabled = !activeObject);
    }
    
    updateSelectedItems() {
        const objects = this.canvas.getObjects().filter(obj => obj.itemData);
        const selectedItemsContainer = document.getElementById('selectedItems');

        if (!selectedItemsContainer) return;

        if (objects.length === 0) {
            selectedItemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>추가된 아이템이 없습니다</p>
                </div>
            `;
            return;
        }

        // 동일한 아이템들을 그룹화
        const groupedItems = this.groupItemsByType(objects);

        selectedItemsContainer.innerHTML = '';

        // 역순으로 추가하여 최신 아이템이 맨 위에 오도록 함
        for (let i = groupedItems.length - 1; i >= 0; i--) {
            const group = groupedItems[i];
            const selectedItem = this.createSelectedItemElement(group, i);
            selectedItemsContainer.appendChild(selectedItem);
        }

        // 현재 선택된 객체가 있으면 하이라이트
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.itemData) {
            this.highlightSelectedItemInList(activeObject);
        }
    }

    // 동일한 아이템들을 그룹화하여 수량 계산
    groupItemsByType(objects) {
        const groups = [];
        const processedIndices = new Set();

        objects.forEach((obj, index) => {
            if (processedIndices.has(index)) return;

            const itemData = obj.itemData;
            const similarObjects = [obj];
            processedIndices.add(index);

            // 동일한 아이템 찾기
            for (let i = index + 1; i < objects.length; i++) {
                if (processedIndices.has(i)) continue;

                const otherData = objects[i].itemData;
                if (this.isSameItem(itemData, otherData)) {
                    similarObjects.push(objects[i]);
                    processedIndices.add(i);
                }
            }

            groups.push({
                representative: obj, // 대표 객체
                quantity: similarObjects.length,
                objects: similarObjects // 동일한 아이템들의 배열
            });
        });

        return groups;
    }

    // 두 아이템이 동일한지 비교
    isSameItem(itemData1, itemData2) {
        // id가 있으면 id로 비교
        if (itemData1.id && itemData2.id) {
            return itemData1.id === itemData2.id &&
                   itemData1.selectedSize === itemData2.selectedSize;
        }

        // id가 없으면 name과 image/src로 비교
        const imagePath1 = itemData1.src || itemData1.image;
        const imagePath2 = itemData2.src || itemData2.image;

        return itemData1.name === itemData2.name &&
               imagePath1 === imagePath2 &&
               itemData1.selectedSize === itemData2.selectedSize;
    }

    highlightSelectedItemInList(canvasObject) {
        if (!canvasObject || !canvasObject.itemData) return;

        const selectedItemsContainer = document.getElementById('selectedItems');
        if (!selectedItemsContainer) return;

        // 모든 아이템에서 active 클래스 제거
        const allItems = selectedItemsContainer.querySelectorAll('.selected-item');
        allItems.forEach(item => item.classList.remove('active'));

        // 선택된 캔버스 객체의 인덱스 찾기
        const canvasObjectIndex = this.canvas.getObjects().indexOf(canvasObject);

        // DOM에서 해당 객체를 포함하는 그룹 찾기
        let targetItem = null;
        for (const item of allItems) {
            const objectIds = item.dataset.objectIds.split(',').map(id => parseInt(id));
            if (objectIds.includes(canvasObjectIndex)) {
                targetItem = item;
                break;
            }
        }

        if (targetItem) {
            targetItem.classList.add('active');
            // 스크롤하여 가운데로 이동
            this.scrollItemToCenter(targetItem, selectedItemsContainer);
        }
    }

    clearItemListHighlight() {
        const selectedItemsContainer = document.getElementById('selectedItems');
        if (!selectedItemsContainer) return;

        const allItems = selectedItemsContainer.querySelectorAll('.selected-item');
        allItems.forEach(item => item.classList.remove('active'));
    }

    scrollItemToCenter(itemElement, container) {
        if (!itemElement || !container) return;

        const containerRect = container.getBoundingClientRect();
        const itemRect = itemElement.getBoundingClientRect();

        // 컨테이너의 중앙 위치 계산
        const containerCenter = containerRect.height / 2;

        // 아이템의 중앙이 컨테이너 중앙에 오도록 스크롤 위치 계산
        const itemCenter = itemRect.height / 2;
        const scrollOffset = itemElement.offsetTop - container.scrollTop - containerCenter + itemCenter;

        // 부드러운 스크롤
        container.scrollTo({
            top: container.scrollTop + scrollOffset,
            behavior: 'smooth'
        });
    }
    
    createSelectedItemElement(group, groupIndex) {
        const object = group.representative;
        const groupObjects = group.objects;
        const quantity = group.quantity;
        const itemData = object.itemData;

        const item = document.createElement('div');
        item.className = 'selected-item';
        item.dataset.groupIndex = groupIndex; // 원본 그룹 인덱스 저장

        // 그룹에 속한 모든 객체의 인덱스를 저장
        const objectIds = groupObjects.map(obj => this.canvas.getObjects().indexOf(obj)).join(',');
        item.dataset.objectIds = objectIds;

        const img = document.createElement('img');
        // Firebase에서 온 데이터의 썸네일 또는 src 필드 사용
        img.src = itemData.thumbnail || itemData.src;
        img.alt = itemData.name;

        const info = document.createElement('div');
        info.className = 'selected-item-info';

        const name = document.createElement('div');
        name.className = 'selected-item-name';
        name.textContent = itemData.name;

        // 표시정보 라벨 추가
        const meta = document.createElement('div');
        meta.className = 'selected-item-meta';
        const displayInfoText = itemData.displayInfo || '';
        meta.textContent = displayInfoText;

        const actions = document.createElement('div');
        actions.className = 'selected-item-actions';

        // 수량 조절 컨트롤
        const quantityControl = document.createElement('div');
        quantityControl.className = 'quantity-control';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.innerHTML = '<i class="fas fa-minus"></i>';
        decreaseBtn.className = 'quantity-btn';
        decreaseBtn.title = '수량 감소';
        decreaseBtn.onclick = (e) => {
            e.stopPropagation();
            if (groupObjects.length > 1) {
                // 마지막 객체 제거
                const lastObj = groupObjects[groupObjects.length - 1];
                this.canvas.remove(lastObj);
                this.canvas.renderAll();
            }
        };

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.className = 'quantity-input';
        quantityInput.value = quantity;
        quantityInput.min = '1';
        quantityInput.onclick = (e) => e.stopPropagation();
        quantityInput.onchange = (e) => {
            e.stopPropagation();
            const newQuantity = parseInt(e.target.value);
            const currentQuantity = groupObjects.length;

            if (newQuantity >= 1) {
                if (newQuantity > currentQuantity) {
                    // 수량 증가: 새 객체 추가
                    const diff = newQuantity - currentQuantity;
                    for (let i = 0; i < diff; i++) {
                        this.addItem(itemData);
                    }
                } else if (newQuantity < currentQuantity) {
                    // 수량 감소: 객체 제거
                    const diff = currentQuantity - newQuantity;

                    // 다중 삭제 시 성능 최적화
                    if (diff > 1) {
                        this.isLoadingState = true;

                        for (let i = 0; i < diff; i++) {
                            const lastObj = groupObjects[groupObjects.length - 1 - i];
                            this.canvas.remove(lastObj);
                        }

                        this.canvas.renderAll();

                        // 이벤트 재개 후 한 번만 업데이트
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
            } else {
                e.target.value = 1;
            }
        };

        const increaseBtn = document.createElement('button');
        increaseBtn.innerHTML = '<i class="fas fa-plus"></i>';
        increaseBtn.className = 'quantity-btn';
        increaseBtn.title = '수량 증가';
        increaseBtn.onclick = (e) => {
            e.stopPropagation();
            // 동일한 아이템 추가
            this.addItem(itemData);
        };

        quantityControl.appendChild(decreaseBtn);
        quantityControl.appendChild(quantityInput);
        quantityControl.appendChild(increaseBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.className = 'item-delete-btn';
        deleteBtn.title = '모두 삭제';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();

            // 다중 삭제 시 성능 최적화: 이벤트 일시 정지
            if (groupObjects.length > 1) {
                this.isLoadingState = true;

                groupObjects.forEach(obj => {
                    this.canvas.remove(obj);
                });

                this.canvas.renderAll();

                // 이벤트 재개 후 한 번만 업데이트
                this.isLoadingState = false;
                this.saveState();
                this.updateUI();
            } else {
                // 단일 객체는 일반 삭제 (이벤트 자동 트리거)
                this.canvas.remove(groupObjects[0]);
                this.canvas.renderAll();
            }
        };

        actions.appendChild(quantityControl);
        actions.appendChild(deleteBtn);
        info.appendChild(name);
        info.appendChild(meta);

        item.appendChild(img);
        item.appendChild(info);
        item.appendChild(actions);

        // 클릭 시 첫 번째 객체 선택
        item.onclick = () => {
            this.canvas.setActiveObject(groupObjects[0]);
            this.canvas.renderAll();
        };

        return item;
    }
    
    hideWelcomeOverlay() {
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }

    showWatermark() {
        // 이 함수는 app.js에서 호출되지만, 현재는 기능이 필요 없습니다.
        // 호환성을 위해 빈 함수로 남겨둡니다.
    }

    hideWatermark() {
        // 이 함수는 app.js에서 호출되지만, 현재는 기능이 필요 없습니다.
        // 호환성을 위해 빈 함수로 남겨둡니다.
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    duplicate() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.clone(cloned => {
                // itemData 깊은 복사 (참조 문제 방지)
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

    clear() {
        // 작업 내용이 있는 경우에만 확인 대화상자 표시
        const hasContent = this.canvas.getObjects().filter(obj => obj.itemData).length > 0 || this.currentBackground;

        if (hasContent) {
            const confirmed = confirm('모든 작업 내용이 삭제됩니다.\n정말 초기화하시겠습니까?');
            if (!confirmed) {
                return; // 사용자가 취소한 경우 함수 종료
            }
        }

        this.canvas.clear();
        this.currentBackground = null;

        const overlay = document.getElementById('canvasOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        }

        this.saveState();
    }

    downloadImage() {
        const dataURL = this.canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
        });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'design.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }

        this.updateZoomDisplay();
    }

    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
            this.applyZoom();
        }
    }

    applyZoom() {
        const wrapper = this.canvas.wrapperEl;
        if (wrapper) {
            wrapper.style.transform = `scale(${this.zoomLevel})`;
            wrapper.style.transformOrigin = 'center center';
        }
        this.updateZoomDisplay();
        this.canvas.calcOffset();
    }

    updateZoomDisplay() {
        const display = document.getElementById('zoomLevelDisplay');
        if (display) {
            display.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }

        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) {
            zoomInBtn.disabled = this.zoomLevel >= this.maxZoom;
        }

        if (zoomOutBtn) {
            zoomOutBtn.disabled = this.zoomLevel <= this.minZoom;
        }
    }

    // 실제 크기 테스트
    testActualSize(sizeInMM = 2) {
        const imagePath = '/assets/items/2mm.png';

        fabric.Image.fromURL(imagePath, (img) => {
            if (!img || !img.width) {
                console.error('이미지 로드 실패:', imagePath);
                alert('이미지를 로드할 수 없습니다.');
                return;
            }

            // mm를 픽셀로 변환
            // 1 inch = 25.4mm
            // 일반적인 화면 DPI = 96
            const DPI = 96;
            const MM_PER_INCH = 25.4;
            const sizeInPixels = (sizeInMM / MM_PER_INCH) * DPI;

            // 이미지의 원본 비율을 유지하면서 크기 조정
            // 더 긴 쪽을 기준으로 스케일 계산 (정사각형이므로 동일)
            const maxDimension = Math.max(img.width, img.height);
            const scale = sizeInPixels / maxDimension;

            img.set({
                left: this.canvas.width / 2,
                top: this.canvas.height / 2,
                scaleX: scale,
                scaleY: scale,
                originX: 'center',
                originY: 'center',
            });

            // 임시 itemData 설정 (캔버스에서 추적하기 위해)
            img.itemData = {
                name: `${sizeInMM}mm 테스트 이미지`,
                src: imagePath
            };

            this.canvas.add(img).setActiveObject(img);
            this.hideWelcomeOverlay();

            // 정보 알림
            const actualSizePx = Math.round(sizeInPixels * 10) / 10;
            const displayWidth = Math.round(img.width * scale * 10) / 10;
            const displayHeight = Math.round(img.height * scale * 10) / 10;

            alert(
                `실제 ${sizeInMM}mm × ${sizeInMM}mm 크기로 표시되었습니다.\n\n` +
                `화면 표시 크기: ${displayWidth}px × ${displayHeight}px\n` +
                `목표 크기: ${actualSizePx}px × ${actualSizePx}px\n` +
                `이미지 원본: ${img.width}px × ${img.height}px\n` +
                `스케일 비율: ${Math.round(scale * 1000) / 10}%\n\n` +
                `※ 화면 DPI: ${DPI}\n` +
                `※ 실제 크기는 모니터 설정에 따라 다를 수 있습니다.`
            );
        }, { crossOrigin: 'anonymous' });
    }
}

/**
 * Guide Modal Manager - 이용 가이드 모달 관리
 */
class GuideModalManager {
    constructor() {
        this.modal = document.getElementById('guideModal');
        this.openBtn = document.getElementById('guideBtn');
        this.closeBtn = document.getElementById('guideModalClose');
        this.init();
    }

    init() {
        // 이용가이드 버튼 클릭 이벤트
        if (this.openBtn) {
            this.openBtn.addEventListener('click', () => this.open());
        }

        // 닫기 버튼 클릭 이벤트
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // 오버레이 클릭 시 닫기
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }

        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            // 모달이 열릴 때 body 스크롤 방지
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            // 모달이 닫힐 때 body 스크롤 복원
            document.body.style.overflow = '';
        }
    }
} 