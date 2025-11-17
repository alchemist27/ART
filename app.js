// Global variables
let canvasManager;
let filterManager;
let guideModalManager;
let itemsData = [];
let backgroundsData = [];
let backgroundCategories = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    showLoading(true);

    try {
        // Load data
        await loadItemsData();
        await loadBackgroundsData();
        await loadBackgroundCategories();

        // Initialize managers
        canvasManager = new CanvasManager('designCanvas');
        filterManager = new FilterManager(itemsData);
        guideModalManager = new GuideModalManager();

        // Make managers globally accessible
        window.canvasManager = canvasManager;
        window.filterManager = filterManager;
        window.guideModalManager = guideModalManager;

        // Initialize UI components
        initializeEventListeners();

        // Render initial content
        renderBackgroundCategories();
        renderBackgrounds();

        showLoading(false);
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showLoading(false);
    }
}

// Data loading functions
async function loadItemsData() {
    try {
        // 먼저 Firebase에서 데이터 로드 시도
        if (window.loadProductsFromFirebase) {
            const firebaseItems = await window.loadProductsFromFirebase();
            if (firebaseItems.length > 0) {
                itemsData = firebaseItems;
                console.log('Firebase에서 items 로드 완료:', itemsData.length, 'items');
                return;
            }
        }
        
        // Firebase 데이터가 없으면 로컬 JSON 파일 사용
        const response = await fetch('/assets/items.json');
        itemsData = await response.json();
        console.log('로컬 JSON에서 items 로드:', itemsData.length, 'items');
    } catch (error) {
        console.error('Failed to load items data:', error);
        // Fallback to empty array
        itemsData = [];
    }
}

async function loadBackgroundsData() {
    try {
        if (window.loadBackgroundsFromFirebase) {
            backgroundsData = await window.loadBackgroundsFromFirebase();
            return;
        }
        backgroundsData = [];
    } catch (error) {
        console.error('배경 이미지 로드 실패:', error);
        backgroundsData = [];
    }
}

async function loadBackgroundCategories() {
    try {
        if (window.loadBackgroundCategoriesFromFirebase) {
            backgroundCategories = await window.loadBackgroundCategoriesFromFirebase();
        }
    } catch (error) {
        backgroundCategories = [];
    }
}

function renderBackgroundCategories() {
    const bgCatDropdown = document.getElementById('backgroundCategoryDropdown');
    if (!bgCatDropdown) return;

    // Keep the default option
    bgCatDropdown.innerHTML = '<option value="" disabled selected>기본배경 / MD추천디자인💕</option>';

    // Calculate image counts per category
    const categoryCounts = {};
    backgroundsData.forEach(bg => {
        const category = bg.category || '기타';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // If no categories from Firebase, show categories from actual backgrounds
    if (backgroundCategories.length === 0) {
        // Get unique categories from backgrounds
        const uniqueCategories = [...new Set(backgroundsData.map(bg => bg.category).filter(Boolean))];

        uniqueCategories.sort().forEach(categoryName => {
            const count = categoryCounts[categoryName] || 0;
            const option = document.createElement('option');
            option.value = categoryName;
            option.textContent = `${categoryName} (${count})`;
            bgCatDropdown.appendChild(option);
        });

        return;
    }

    // Add categories from Firebase with counts
    backgroundCategories.forEach(cat => {
        const count = categoryCounts[cat.name] || 0;
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = `${cat.name} (${count})`;
        bgCatDropdown.appendChild(option);
    });
}

// Canvas and filter initialization is now handled by managers

// Event listeners initialization
function initializeEventListeners() {
    // Header buttons
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => canvasManager.clear());
    }
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => canvasManager.toggleFullscreen());
    }
    
    // Canvas controls
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => canvasManager.undo());
    }
    
    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => canvasManager.redo());
    }
    
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
        captureBtn.addEventListener('click', () => canvasManager.downloadImage());
    }

    const testSizeBtn = document.getElementById('testSizeBtn');
    const testSizeSelect = document.getElementById('testSizeSelect');
    if (testSizeBtn && testSizeSelect) {
        testSizeBtn.addEventListener('click', () => {
            const selectedSize = parseInt(testSizeSelect.value);
            canvasManager.testActualSize(selectedSize);
        });
    }

    // Layer controls
    const bringToFrontBtn = document.getElementById('bringToFrontBtn');
    if (bringToFrontBtn) {
        bringToFrontBtn.addEventListener('click', () => canvasManager.bringToFront());
    }
    
    const sendToBackBtn = document.getElementById('sendToBackBtn');
    if (sendToBackBtn) {
        sendToBackBtn.addEventListener('click', () => canvasManager.sendToBack());
    }
    
    const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
    if (flipHorizontalBtn) {
        flipHorizontalBtn.addEventListener('click', () => canvasManager.flipHorizontal());
    }
    
    const duplicateBtn = document.getElementById('duplicateBtn');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => canvasManager.duplicate());
    }
    
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => canvasManager.deleteSelected());
    }
    
    // Cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }

    // Reset items button
    const resetItemsBtn = document.getElementById('resetItemsBtn');
    if (resetItemsBtn) {
        resetItemsBtn.addEventListener('click', handleResetItems);
    }
    
    // Background upload functionality
    const uploadBackgroundBtn = document.getElementById('uploadBackgroundBtn');
    const backgroundFileInput = document.getElementById('backgroundFileInput');
    
    if (uploadBackgroundBtn && backgroundFileInput) {
        uploadBackgroundBtn.addEventListener('click', () => {
            backgroundFileInput.click();
        });
        
        backgroundFileInput.addEventListener('change', handleBackgroundUpload);
    }

    // 배경 카테고리 드롭다운 이벤트
    const bgCatDropdown = document.getElementById('backgroundCategoryDropdown');
    if (bgCatDropdown) {
        bgCatDropdown.addEventListener('change', (e) => {
            selectedBgCategory = e.target.value;
            renderBackgrounds();
        });
    }
}

// Item rendering is now handled by FilterManager

// 배경 카테고리 반환 함수
function getBackgroundCategory(bg) {
    // Firebase에서 온 데이터는 category 필드 사용
    return bg.category || '기타';
}

// 드롭다운 카테고리 필터링용 전역 변수
let selectedBgCategory = '';

function renderBackgrounds() {
    const backgroundGrid = document.getElementById('backgroundGrid');

    if (!backgroundGrid) return;

    backgroundGrid.innerHTML = '';

    // 필터링
    let filtered = backgroundsData;
    if (selectedBgCategory && selectedBgCategory !== '') {
        filtered = backgroundsData.filter(bg => getBackgroundCategory(bg) === selectedBgCategory);
    }

    if (filtered.length === 0) {
        backgroundGrid.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">이 카테고리에 배경이 없습니다.</div>';
        return;
    }

    filtered.forEach((bg, index) => {
        const bgCard = createBackgroundCard(bg, false); // 기본 활성화 제거
        backgroundGrid.appendChild(bgCard);
    });

    // 워터마크 로고 표시 (배경 선택 전까지)
    if (canvasManager) {
        canvasManager.showWatermark();
    }
}

function createBackgroundCard(bg, isActive = false) {
    const card = document.createElement('div');
    card.className = `background-card ${isActive ? 'active' : ''}`;
    card.dataset.bgId = bg.id;

    const img = document.createElement('img');
    // Firebase에서 온 데이터의 src 필드 사용
    if (!bg.src) {
        console.error('배경 이미지 URL이 없습니다:', bg);
        return card; // Return empty card if no image
    }
    img.src = bg.src;
    img.alt = bg.name || 'Background';
    
    const name = document.createElement('div');
    name.className = 'bg-name';
    name.textContent = bg.name;
    
    card.appendChild(img);
    card.appendChild(name);
    
    // Add click event to change background
    card.addEventListener('click', () => {
        setActiveBackground(card);
        setCanvasBackground(bg);
    });
    
    return card;
}

// Canvas functions are now handled by CanvasManager

function setCanvasBackground(bg) {
    if (!canvasManager || !bg) {
        console.error('Canvas manager or background data is missing');
        return;
    }
    
    console.log('Setting canvas background:', bg);
    
    // 워터마크 숨기기
    canvasManager.hideWatermark();
    
    // 환영 오버레이 숨기기
    canvasManager.hideWelcomeOverlay();
    
    canvasManager.setBackground(bg).then(() => {
        console.log('Background set successfully:', bg.name);
        
        // 오버레이 완전히 숨기기
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
        
        // 강제로 캔버스 다시 렌더링
        setTimeout(() => {
            canvasManager.canvas.renderAll();
            // console.log('Final canvas render completed');
            
            // 디버깅 모드일 때만 캔버스 상호작용 상태 확인
            if (window.DEBUG_MODE) {
                // canvasManager.debugCanvasInteraction();
            }
        }, 100);
    }).catch(err => {
        console.error('Failed to set background:', err);
        // 배경 설정 실패 시 워터마크 다시 표시
        canvasManager.showWatermark();
    });
}

function setActiveBackground(activeCard) {
    // Remove active class from all background cards
    document.querySelectorAll('.background-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    activeCard.classList.add('active');
}

function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        showNotification('이미지 파일만 업로드할 수 있습니다.', 'error');
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('파일 크기는 10MB 이하여야 합니다.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        
        // Create a temporary background object
        const customBackground = {
            id: 'custom-' + Date.now(),
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
            image: imageUrl,
            isCustom: true
        };
        
        // Set the custom background
        setCustomCanvasBackground(customBackground);
        
        // Clear the file input
        event.target.value = '';
        
        showNotification('배경 이미지가 성공적으로 업로드되었습니다!', 'success');
    };
    
    reader.onerror = function() {
        showNotification('파일을 읽는 중 오류가 발생했습니다.', 'error');
    };
    
    reader.readAsDataURL(file);
}

function setCustomCanvasBackground(customBackground) {
    if (!canvasManager || !customBackground) {
        console.error('Canvas manager or background data is missing');
        return;
    }
    
    console.log('Setting custom canvas background:', customBackground);
    
    // 워터마크 숨기기
    canvasManager.hideWatermark();
    
    // 환영 오버레이 숨기기
    canvasManager.hideWelcomeOverlay();
    
    // Use the custom image URL directly
    fabric.Image.fromURL(customBackground.image, (img) => {
        if (!img) {
            console.error('Failed to load custom background image');
            showNotification('이미지 로드에 실패했습니다.', 'error');
            return;
        }
        
        canvasManager.canvas.setBackgroundImage(img, canvasManager.canvas.renderAll.bind(canvasManager.canvas), {
            scaleX: canvasManager.canvas.width / img.width,
            scaleY: canvasManager.canvas.height / img.height
        });
        
        canvasManager.currentBackground = customBackground;
        
        // 오버레이 완전히 숨기기
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
        
        // 강제로 캔버스 다시 렌더링
        setTimeout(() => {
            canvasManager.canvas.renderAll();
        }, 100);
        
        console.log('Custom background set successfully:', customBackground.name);
    }, { crossOrigin: 'anonymous' });
}

// Filter functions are now handled by FilterManager

// Canvas control functions are now handled by CanvasManager

// UI update functions are now handled by CanvasManager

// Cart functionality
function handleAddToCart() {
    if (!canvasManager) return;

    const objects = canvasManager.canvas.getObjects();
    const items = objects.filter(obj => obj.itemData);

    if (items.length === 0) {
        showNotification('캔버스에 추가된 아이템이 없습니다.', 'info');
        return;
    }

    // 아이템별 수량 집계 (productCode 기준)
    const itemQuantityMap = new Map();

    items.forEach(obj => {
        const itemData = obj.itemData;
        const productCode = itemData.productCode;

        // productCode가 없으면 스킵
        if (!productCode) {
            console.warn('상품코드가 없는 아이템:', itemData);
            return;
        }

        // 수량 카운트
        if (itemQuantityMap.has(productCode)) {
            itemQuantityMap.set(productCode, itemQuantityMap.get(productCode) + 1);
        } else {
            itemQuantityMap.set(productCode, 1);
        }
    });

    // Cafe24 장바구니 형식으로 변환
    const cartItems = Array.from(itemQuantityMap.entries()).map(([productCode, quantity]) => {
        // 원본 아이템 데이터 찾기
        const originalItem = items.find(obj => obj.itemData.productCode === productCode);
        const itemData = originalItem.itemData;

        return {
            productCode: productCode,
            productName: itemData.productName || itemData.name,
            quantity: quantity,
            // 추가 정보 (디버깅용)
            id: itemData.id,
            displayInfo: itemData.displayInfo
        };
    });

    console.log('장바구니에 담을 아이템들:', cartItems);

    // Cafe24 장바구니 API 호출
    if (cartItems.length > 0) {
        addToCart(cartItems);
    } else {
        showNotification('상품코드가 등록된 아이템이 없습니다.', 'warning');
    }
}

// Cafe24 장바구니 API 호출
async function addToCart(cartItems) {
    try {
        // Cafe24 Shop ID (환경변수나 설정 파일에서 가져오기)
        const CAFE24_SHOP_ID = window.CAFE24_SHOP_ID || 'sugardeco';

        // Cafe24 장바구니 추가 URL
        const baseUrl = `https://${CAFE24_SHOP_ID}.cafe24.com/exec/front/order/basket/`;

        // 각 상품을 장바구니에 추가
        const addPromises = cartItems.map((item, index) => {
            const params = new URLSearchParams({
                product_code: item.productCode,
                quantity: item.quantity,
                opt_value: '',  // 옵션이 있다면 추가
            });

            // 여러 상품을 한번에 담기 위해 배열 형식으로 전송
            return fetch(`${baseUrl}?${params.toString()}`, {
                method: 'GET',
                mode: 'no-cors'  // CORS 제한 우회
            });
        });

        await Promise.all(addPromises);

        // 성공 메시지 표시
        showNotification(`${cartItems.length}종 총 ${cartItems.reduce((sum, item) => sum + item.quantity, 0)}개 아이템이 장바구니에 담겼습니다!`, 'success');

        // 장바구니 페이지로 이동 여부 확인
        setTimeout(() => {
            if (confirm('장바구니로 이동하시겠습니까?')) {
                window.open(`https://${CAFE24_SHOP_ID}.cafe24.com/order/basket.html`, '_blank');
            }
        }, 500);

    } catch (error) {
        console.error('장바구니 추가 실패:', error);
        showNotification('장바구니 추가 중 오류가 발생했습니다.', 'error');
    }
}

// Reset items functionality
function handleResetItems() {
    if (!canvasManager) return;

    const objects = canvasManager.canvas.getObjects();
    const items = objects.filter(obj => obj.itemData);

    if (items.length === 0) {
        showNotification('삭제할 아이템이 없습니다.', 'info');
        return;
    }

    // 확인 메시지
    if (!confirm(`캔버스에 있는 모든 아이템을 삭제하시겠습니까?`)) {
        return;
    }

    // 모든 아이템 삭제 (배경은 유지)
    items.forEach(obj => {
        canvasManager.canvas.remove(obj);
    });

    canvasManager.canvas.renderAll();
    showNotification('모든 아이템이 삭제되었습니다.', 'success');
}

function showNotification(message, type = 'info') {
    // 간단한 알림 표시 (실제로는 더 정교한 알림 시스템을 구현할 수 있음)
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 스타일 설정
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.color = 'white';
    notification.style.fontWeight = '500';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'transform 0.3s ease-in-out';
    
    // 타입별 배경색
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#6366f1';
            break;
    }
    
    document.body.appendChild(notification);
    
    // 애니메이션으로 표시
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 3초 후 제거
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 