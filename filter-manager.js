/**
 * Filter Manager - 검색 및 필터링 시스템
 */
class FilterManager {
    constructor(itemsData) {
        this.originalItems = itemsData || [];
        this.filteredItems = [...this.originalItems];
        this.activeFilters = {
            search: '',
            type: 'all',
            color: ['all'], // 배열로 변경하여 다중 선택 지원
            direction: 'all',
            creamPart: 'all',
            moru: 'all',
            bunjae: 'all',
            hairpin: 'all',
            pendant: 'all',
            string: 'all',
            phoneAccessory: 'all',
            sort: 'popular' // 정렬 옵션 추가
        };
        this.currentPopup = null; // 현재 열린 사이즈 옵션 팝업

        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.renderFilterUI();
        console.log('Filter Manager initialized');
    }
    
    setupEventListeners() {
        // 검색 입력
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.setFilter('search', e.target.value);
                this.applyFilters();
            }, 300));
        }
        
        // 타입 필터
        const typeFilters = document.getElementById('typeFilters');
        if (typeFilters) {
            typeFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'typeFilters');
                    this.setFilter('type', e.target.dataset.filter);

                    const selectedType = e.target.dataset.filter;

                    // 색상 필터 그룹 표시/숨김 처리
                    const colorFilterGroup = document.getElementById('colorFilterGroup');
                    if (colorFilterGroup) {
                        if (selectedType === '폰악세서리') {
                            // 폰악세서리 선택 시 색상 그룹 완전히 숨김
                            colorFilterGroup.style.display = 'none';
                        } else {
                            // 다른 타입 선택 시 색상 그룹 표시
                            colorFilterGroup.style.display = '';
                            if (selectedType !== 'all') {
                                this.openFilterGroup('colorFilterGroup');
                            } else {
                                this.closeFilterGroup('colorFilterGroup');
                            }
                        }
                    }

                    // 모든 세부 옵션 그룹 닫기
                    this.closeAllSubGroups();

                    // 비즈 방향 필터 그룹 표시/숨김 처리
                    const directionGroup = document.getElementById('directionFilterGroup');
                    if (directionGroup) {
                        if (selectedType === '비즈') {
                            directionGroup.style.display = '';
                            this.openFilterGroup('directionFilterGroup');
                        } else {
                            directionGroup.style.display = 'none';
                        }
                    }
                    // 생크림/파츠 타입 필터 그룹 표시/숨김 처리
                    const creamPartGroup = document.getElementById('creamPartFilterGroup');
                    if (creamPartGroup) {
                        if (selectedType === '생크림/파츠') {
                            creamPartGroup.style.display = '';
                            this.openFilterGroup('creamPartFilterGroup');
                        } else {
                            creamPartGroup.style.display = 'none';
                        }
                    }
                    // 모루공예 타입 필터 그룹 표시/숨김 처리
                    const moruGroup = document.getElementById('moruFilterGroup');
                    if (moruGroup) {
                        if (selectedType === '모루공예') {
                            moruGroup.style.display = '';
                            this.openFilterGroup('moruFilterGroup');
                        } else {
                            moruGroup.style.display = 'none';
                        }
                    }
                    // 부자재 타입 필터 그룹 표시/숨김 처리
                    const bunjaeGroup = document.getElementById('bunjaeFilterGroup');
                    if (bunjaeGroup) {
                        if (selectedType === '부자재') {
                            bunjaeGroup.style.display = '';
                            this.openFilterGroup('bunjaeFilterGroup');
                        } else {
                            bunjaeGroup.style.display = 'none';
                        }
                    }
                    // 비녀공예 타입 필터 그룹 표시/숨김 처리
                    const hairpinGroup = document.getElementById('hairpinFilterGroup');
                    if (hairpinGroup) {
                        if (selectedType === '비녀공예') {
                            hairpinGroup.style.display = '';
                            this.openFilterGroup('hairpinFilterGroup');
                        } else {
                            hairpinGroup.style.display = 'none';
                        }
                    }
                    // 팬던트 모양 필터 그룹 표시/숨김 처리
                    const pendantGroup = document.getElementById('pendantFilterGroup');
                    if (pendantGroup) {
                        if (selectedType === '팬던트') {
                            pendantGroup.style.display = '';
                            this.openFilterGroup('pendantFilterGroup');
                        } else {
                            pendantGroup.style.display = 'none';
                        }
                    }
                    // 끈/줄 타입 필터 그룹 표시/숨김 처리
                    const stringGroup = document.getElementById('stringFilterGroup');
                    if (stringGroup) {
                        if (selectedType === '끈/줄') {
                            stringGroup.style.display = '';
                            this.openFilterGroup('stringFilterGroup');
                        } else {
                            stringGroup.style.display = 'none';
                        }
                    }
                    // 폰악세서리 타입 필터 그룹 표시/숨김 처리
                    const phoneAccessoryGroup = document.getElementById('phoneAccessoryFilterGroup');
                    if (phoneAccessoryGroup) {
                        if (selectedType === '폰악세서리') {
                            phoneAccessoryGroup.style.display = '';
                            this.openFilterGroup('phoneAccessoryFilterGroup');
                        } else {
                            phoneAccessoryGroup.style.display = 'none';
                        }
                    }
                    this.applyFilters();
                }
            });
        }
        
        // 색상 필터
        const colorFilters = document.getElementById('colorFilters');
        if (colorFilters) {
            colorFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    const color = e.target.dataset.filter;
                    let selectedColors = [...this.activeFilters.color];

                    if (color === 'all') {
                        // '전체' 클릭 시 모두 해제하고 'all'만 남김
                        selectedColors = ['all'];
                        colorFilters.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
                        e.target.classList.add('active');
                    } else {
                        // 'all'이 선택되어 있으면 해제
                        selectedColors = selectedColors.filter(c => c !== 'all');
                        if (selectedColors.includes(color)) {
                            // 이미 선택된 색상 클릭 시 해제
                            selectedColors = selectedColors.filter(c => c !== color);
                            e.target.classList.remove('active');
                        } else {
                            // 새 색상 추가
                            selectedColors.push(color);
                            e.target.classList.add('active');
                        }
                        // 아무것도 선택 안 하면 'all' 활성화
                        if (selectedColors.length === 0) {
                            selectedColors = ['all'];
                            colorFilters.querySelector('[data-filter="all"]').classList.add('active');
                        } else {
                            colorFilters.querySelector('[data-filter="all"]').classList.remove('active');
                        }
                    }
                    this.setFilter('color', selectedColors);

                    // 색상 선택 시 현재 타입에 맞는 세부 옵션 그룹 자동 open
                    if (!selectedColors.includes('all')) {
                        const currentType = this.activeFilters.type;
                        if (currentType === '비즈') {
                            this.openFilterGroup('directionFilterGroup');
                        } else if (currentType === '생크림/파츠') {
                            this.openFilterGroup('creamPartFilterGroup');
                        } else if (currentType === '모루공예') {
                            this.openFilterGroup('moruFilterGroup');
                        } else if (currentType === '부자재') {
                            this.openFilterGroup('bunjaeFilterGroup');
                        } else if (currentType === '비녀공예') {
                            this.openFilterGroup('hairpinFilterGroup');
                        } else if (currentType === '팬던트') {
                            this.openFilterGroup('pendantFilterGroup');
                        } else if (currentType === '끈/줄') {
                            this.openFilterGroup('stringFilterGroup');
                        }
                    }

                    this.applyFilters();
                }
            });
        }

        // 색상 필터 리셋 버튼
        const colorResetBtn = document.getElementById('colorResetBtn');
        if (colorResetBtn) {
            colorResetBtn.addEventListener('click', () => {
                this.resetColorFilter();
            });
        }
        
        // 비즈 방향 필터
        const directionFilters = document.getElementById('directionFilters');
        if (directionFilters) {
            directionFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'directionFilters');
                    this.setFilter('direction', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 생크림/파츠 필터
        const creamPartFilters = document.getElementById('creamPartFilters');
        if (creamPartFilters) {
            creamPartFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'creamPartFilters');
                    this.setFilter('creamPart', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 모루공예 필터
        const moruFilters = document.getElementById('moruFilters');
        if (moruFilters) {
            moruFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'moruFilters');
                    this.setFilter('moru', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 부자재 필터
        const bunjaeFilters = document.getElementById('bunjaeFilters');
        if (bunjaeFilters) {
            bunjaeFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'bunjaeFilters');
                    this.setFilter('bunjae', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 비녀공예 필터
        const hairpinFilters = document.getElementById('hairpinFilters');
        if (hairpinFilters) {
            hairpinFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'hairpinFilters');
                    this.setFilter('hairpin', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 팬던트 필터
        const pendantFilters = document.getElementById('pendantFilters');
        if (pendantFilters) {
            pendantFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'pendantFilters');
                    this.setFilter('pendant', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 끈/줄 필터
        const stringFilters = document.getElementById('stringFilters');
        if (stringFilters) {
            stringFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'stringFilters');
                    this.setFilter('string', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 폰악세서리 필터
        const phoneAccessoryFilters = document.getElementById('phoneAccessoryFilters');
        if (phoneAccessoryFilters) {
            phoneAccessoryFilters.addEventListener('click', (e) => {
                if (e.target.classList.contains('tag-btn')) {
                    this.setActiveButton(e.target, 'phoneAccessoryFilters');
                    this.setFilter('phoneAccessory', e.target.dataset.filter);
                    this.applyFilters();
                }
            });
        }

        // 정렬 탭
        const sortTabs = document.getElementById('sortTabs');
        if (sortTabs) {
            sortTabs.addEventListener('click', (e) => {
                if (e.target.classList.contains('sort-tab')) {
                    this.setActiveSortTab(e.target);
                    this.setFilter('sort', e.target.dataset.sort);
                    this.applyFilters();
                }
            });
        }

        // 아코디언 토글 기능
        this.setupAccordion();
    }

    setupAccordion() {
        const filterGroups = document.querySelectorAll('.filter-group');

        filterGroups.forEach(group => {
            const header = group.querySelector('.filter-group-header');
            if (header) {
                header.addEventListener('click', (e) => {
                    // 리셋 버튼 클릭 시 아코디언 토글 방지
                    if (e.target.closest('.filter-reset-btn')) {
                        return;
                    }
                    group.classList.toggle('collapsed');
                });
            }
        });
    }

    // 필터 그룹 열기
    openFilterGroup(groupId) {
        const group = document.getElementById(groupId);
        if (group) {
            group.classList.remove('collapsed');
        }
    }

    // 필터 그룹 닫기
    closeFilterGroup(groupId) {
        const group = document.getElementById(groupId);
        if (group) {
            group.classList.add('collapsed');
        }
    }

    // 모든 세부 옵션 그룹 닫기
    closeAllSubGroups() {
        const subGroups = [
            'directionFilterGroup',
            'creamPartFilterGroup',
            'moruFilterGroup',
            'bunjaeFilterGroup',
            'hairpinFilterGroup',
            'pendantFilterGroup',
            'stringFilterGroup',
            'phoneAccessoryFilterGroup'
        ];
        subGroups.forEach(groupId => this.closeFilterGroup(groupId));
    }
    
    renderFilterUI() {
        this.updateItemCount();
    }
    
    setFilter(type, value) {
        this.activeFilters[type] = value;
    }
    
    setActiveButton(activeBtn, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        activeBtn.classList.add('active');
    }
    
    setActiveSortTab(activeTab) {
        const sortTabs = document.getElementById('sortTabs');
        if (!sortTabs) return;
        
        sortTabs.querySelectorAll('.sort-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        activeTab.classList.add('active');
    }
    
    applyFilters() {
        this.filteredItems = this.originalItems.filter(item => {
            return this.matchesSearch(item) &&
                   this.matchesType(item) &&
                   this.matchesColor(item) &&
                   this.matchesDirection(item) &&
                   this.matchesCreamPart(item) &&
                   this.matchesMoru(item) &&
                   this.matchesBunjae(item) &&
                   this.matchesHairpin(item) &&
                   this.matchesPendant(item) &&
                   this.matchesString(item) &&
                   this.matchesPhoneAccessory(item);
        });

        // 정렬 적용
        this.sortItems();

        this.updateItemCount();
        this.renderItems();
        this.dispatchFilterEvent();
    }
    
    matchesSearch(item) {
        const searchTerm = this.activeFilters.search.toLowerCase();
        if (!searchTerm) return true;

        // 상품명 검색 (Cafe24 상품명)
        if (item.productName && item.productName.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // name 필드 검색 (하위 호환성)
        if (item.name && item.name.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // CMS에서 입력한 키워드 검색
        if (item.keywords && Array.isArray(item.keywords)) {
            if (item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))) {
                return true;
            }
        }

        return false;
    }
    
    matchesType(item) {
        const typeFilter = this.activeFilters.type;
        if (typeFilter === 'all') return true;

        // categories 배열이 있으면 우선 확인 (새 구조)
        if (item.categories && Array.isArray(item.categories)) {
            // categories 배열의 각 값을 파싱하여 대분류 확인
            for (const category of item.categories) {
                const mainType = category.includes('-') ? category.split('-')[0] : category;
                if (mainType === typeFilter) {
                    return true;
                }
            }
        }

        // 하위 호환성: 기존 방식도 지원
        return item.type === typeFilter || item.tags.includes(typeFilter);
    }
    
    matchesColor(item) {
        const colorFilter = this.activeFilters.color;
        if (colorFilter.includes('all')) return true; // 배열에 'all'이 포함되어 있으면 모든 색상 통과
        
        return colorFilter.some(color => item.color === color || item.tags.includes(color));
    }
    
    matchesDirection(item) {
        const directionFilter = this.activeFilters.direction;
        if (directionFilter === 'all') return true;

        // 비즈 방향 필터링 - tags 배열에서 방향 정보 확인
        return item.tags.includes(directionFilter);
    }

    matchesCreamPart(item) {
        const creamPartFilter = this.activeFilters.creamPart;
        if (creamPartFilter === 'all') return true;

        // 생크림/파츠 필터링 - tags 배열에서 확인
        return item.tags.includes(creamPartFilter);
    }

    matchesMoru(item) {
        const moruFilter = this.activeFilters.moru;
        if (moruFilter === 'all') return true;

        // 모루공예 필터링 - tags 배열에서 확인
        return item.tags.includes(moruFilter);
    }

    matchesBunjae(item) {
        const bunjaeFilter = this.activeFilters.bunjae;
        if (bunjaeFilter === 'all') return true;

        // 부자재 필터링 - tags 배열에서 확인
        return item.tags.includes(bunjaeFilter);
    }

    matchesHairpin(item) {
        const hairpinFilter = this.activeFilters.hairpin;
        if (hairpinFilter === 'all') return true;

        // 비녀공예 필터링 - tags 배열에서 확인
        return item.tags.includes(hairpinFilter);
    }

    matchesPendant(item) {
        const pendantFilter = this.activeFilters.pendant;
        if (pendantFilter === 'all') return true;

        // 팬던트 필터링 - tags 배열에서 확인
        return item.tags.includes(pendantFilter);
    }

    matchesString(item) {
        const stringFilter = this.activeFilters.string;
        if (stringFilter === 'all') return true;

        // 끈/줄 필터링 - tags 배열에서 확인
        return item.tags.includes(stringFilter);
    }

    matchesPhoneAccessory(item) {
        const phoneAccessoryFilter = this.activeFilters.phoneAccessory;
        if (phoneAccessoryFilter === 'all') return true;

        // 폰악세서리 필터링 - tags 배열에서 확인
        return item.tags.includes(phoneAccessoryFilter);
    }

    sortItems() {
        const sortType = this.activeFilters.sort;
        
        switch (sortType) {
            case 'popular':
                // 인기순 - 기본 순서 유지 (items.json의 순서)
                break;
            case 'small':
                // 작은순 - 크기 기준 오름차순
                this.filteredItems.sort((a, b) => {
                    const sizeA = (a.width || 0) * (a.height || 0);
                    const sizeB = (b.width || 0) * (b.height || 0);
                    return sizeA - sizeB;
                });
                break;
            case 'large':
                // 큰순 - 크기 기준 내림차순
                this.filteredItems.sort((a, b) => {
                    const sizeA = (a.width || 0) * (a.height || 0);
                    const sizeB = (b.width || 0) * (b.height || 0);
                    return sizeB - sizeA;
                });
                break;
            default:
                break;
        }
    }
    
    renderItems() {
        const itemsGrid = document.getElementById('itemsGrid');
        if (!itemsGrid) return;
        
        itemsGrid.innerHTML = '';
        
        if (this.filteredItems.length === 0) {
            this.renderEmptyState(itemsGrid);
            return;
        }
        
        this.filteredItems.forEach(item => {
            const itemCard = this.createItemCard(item);
            itemsGrid.appendChild(itemCard);
        });
    }
    
    renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state-grid">
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h4>검색된 제품이 없습니다</h4>
                    <p>다른 필터로 시도해보세요</p>
                </div>
            </div>
        `;
    }
    
    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card fade-in';
        card.dataset.itemId = item.id;

        const img = document.createElement('img');
        // 왼쪽 패널에는 썸네일 표시 (thumbnail 우선, 없으면 src)
        img.src = item.thumbnail || item.src;
        img.alt = item.name;
        img.draggable = false;

        const name = document.createElement('div');
        name.className = 'item-name';
        name.textContent = item.name;

        card.appendChild(img);
        card.appendChild(name);

        // 모든 이미지를 자동으로 캔버스에 추가 (오프셋 적용)
        card.addEventListener('click', () => {
            this.addItemToCanvas(item);
            this.addClickEffect(card);
        });

        return card;
    }

    showImageSelectPopup(card, item) {
        // 기존 팝업 제거
        this.closeSizeOptionsPopup();

        // 새 팝업 생성
        const overlay = this.createImageSelectOverlay(item);
        document.body.appendChild(overlay);

        // 위치 계산
        const rect = card.getBoundingClientRect();
        const popupWidth = 250;  // 이미지 미리보기용으로 더 넓게
        const gap = 8;

        // 카드 오른쪽에 표시
        let left = rect.right + gap;
        let top = rect.top;

        // 화면 밖으로 나가면 왼쪽에 표시
        if (left + popupWidth > window.innerWidth) {
            left = rect.left - popupWidth - gap;
        }

        // 아래로 너무 내려가면 위로 올림
        if (top + overlay.offsetHeight > window.innerHeight) {
            top = window.innerHeight - overlay.offsetHeight - gap;
        }

        overlay.style.left = `${left}px`;
        overlay.style.top = `${top}px`;
        overlay.classList.add('active');

        // 외부 클릭 시 닫기
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 0);

        // 현재 팝업 저장
        this.currentPopup = overlay;
    }

    showSizeOptionsPopup(card, item, sizeOptions) {
        // 기존 팝업 제거
        this.closeSizeOptionsPopup();

        // 새 팝업 생성
        const overlay = this.createSizeOptionsOverlay(item, sizeOptions);
        document.body.appendChild(overlay);

        // 위치 계산
        const rect = card.getBoundingClientRect();
        const popupWidth = 120;
        const gap = 8;

        // 카드 오른쪽에 표시
        let left = rect.right + gap;
        let top = rect.top;

        // 화면 밖으로 나가면 왼쪽에 표시
        if (left + popupWidth > window.innerWidth) {
            left = rect.left - popupWidth - gap;
        }

        // 아래로 너무 내려가면 위로 올림
        if (top + overlay.offsetHeight > window.innerHeight) {
            top = window.innerHeight - overlay.offsetHeight - gap;
        }

        overlay.style.left = `${left}px`;
        overlay.style.top = `${top}px`;
        overlay.classList.add('active');

        // 외부 클릭 시 닫기
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 0);

        // 현재 팝업 저장
        this.currentPopup = overlay;
    }

    closeSizeOptionsPopup() {
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    handleOutsideClick = (e) => {
        if (this.currentPopup && !this.currentPopup.contains(e.target) && !e.target.closest('.item-card')) {
            this.closeSizeOptionsPopup();
        }
    }

    createImageSelectOverlay(item) {
        const overlay = document.createElement('div');
        overlay.className = 'size-options-overlay image-select-overlay';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'size-option-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeSizeOptionsPopup();
        };

        const title = document.createElement('div');
        title.className = 'size-option-title';
        title.textContent = '이미지 선택';

        const imagesContainer = document.createElement('div');
        imagesContainer.className = 'image-select-buttons';

        item.images.forEach((imageInfo, index) => {
            const imageBtn = document.createElement('div');
            imageBtn.className = 'image-option-btn';

            const img = document.createElement('img');
            img.src = imageInfo.url;
            img.alt = `이미지 ${index + 1}`;

            imageBtn.appendChild(img);
            imageBtn.onclick = (e) => {
                e.stopPropagation();
                // 선택한 이미지로 src 변경하여 캔버스에 추가
                this.addItemToCanvas({...item, src: imageInfo.url, selectedImage: imageInfo});
                this.closeSizeOptionsPopup();
            };
            imagesContainer.appendChild(imageBtn);
        });

        overlay.appendChild(closeBtn);
        overlay.appendChild(title);
        overlay.appendChild(imagesContainer);

        return overlay;
    }

    createSizeOptionsOverlay(item, sizeOptions) {
        const overlay = document.createElement('div');
        overlay.className = 'size-options-overlay';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'size-option-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeSizeOptionsPopup();
        };

        const title = document.createElement('div');
        title.className = 'size-option-title';
        title.textContent = '사이즈 선택';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'size-option-buttons';

        sizeOptions.forEach(size => {
            const btn = document.createElement('button');
            btn.className = 'size-option-btn';
            btn.textContent = size;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.addItemToCanvas({...item, selectedSize: size});
                this.closeSizeOptionsPopup();
            };
            buttonsContainer.appendChild(btn);
        });

        overlay.appendChild(closeBtn);
        overlay.appendChild(title);
        overlay.appendChild(buttonsContainer);

        return overlay;
    }
    
    addItemToCanvas(item) {
        if (window.canvasManager) {
            window.canvasManager.addItem(item).then(() => {
                console.log('Item added to canvas:', item.name);
            }).catch(error => {
                console.error('Failed to add item to canvas:', error);
            });
        }
    }
    
    addClickEffect(card) {
        card.classList.add('clicked');
        setTimeout(() => {
            card.classList.remove('clicked');
        }, 200);
    }
    
    updateItemCount() {
        const itemsCount = document.getElementById('itemsCount');
        if (itemsCount) {
            const total = this.originalItems.length;
            const filtered = this.filteredItems.length;
            
            if (filtered === total) {
                itemsCount.textContent = `${total}개 아이템`;
            } else {
                itemsCount.textContent = `${filtered}개 / ${total}개 아이템`;
            }
        }
    }
    
    resetColorFilter() {
        // 색상 필터만 초기화
        this.activeFilters.color = ['all'];

        const colorFilters = document.getElementById('colorFilters');
        if (colorFilters) {
            // 모든 색상 버튼에서 active 클래스 제거
            colorFilters.querySelectorAll('.tag-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // '전체' 버튼에 active 클래스 추가
            const allBtn = colorFilters.querySelector('[data-filter="all"]');
            if (allBtn) {
                allBtn.classList.add('active');
            }
        }

        this.applyFilters();
    }

    clearFilters() {
        this.activeFilters = {
            search: '',
            type: 'all',
            color: ['all'],
            direction: 'all',
            creamPart: 'all',
            moru: 'all',
            bunjae: 'all',
            hairpin: 'all',
            pendant: 'all',
            string: 'all',
            sort: 'popular'
        };

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.querySelectorAll('[data-filter="all"]').forEach(btn => {
            btn.classList.add('active');
        });

        // 정렬 탭 초기화
        const sortTabs = document.getElementById('sortTabs');
        if (sortTabs) {
            sortTabs.querySelectorAll('.sort-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            sortTabs.querySelector('[data-sort="popular"]').classList.add('active');
        }

        this.applyFilters();
    }
    
    dispatchFilterEvent() {
        const event = new CustomEvent('filtersChanged', {
            detail: {
                activeFilters: this.activeFilters,
                filteredItems: this.filteredItems,
                itemCount: this.filteredItems.length
            }
        });
        
        document.dispatchEvent(event);
    }
    
    debounce(func, wait) {
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
    
    updateItems(newItems) {
        this.originalItems = newItems;
        this.applyFilters();
    }
    
    getFilteredItems() {
        return this.filteredItems;
    }
} 