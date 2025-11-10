import { Sidebar } from '../components/Sidebar.js';
import { backgroundService } from '../services/backgroundService.js';
import { backgroundCategoryService } from '../services/backgroundCategoryService.js';

export class BackgroundsPage {
    constructor(container) {
        this.container = container;
        this.backgrounds = [];
        this.allBackgrounds = []; // For counting purposes
        this.categories = [];
        this.isLoading = false;
        this.selectedCategory = 'all';

        this.render();
        this.loadCategories();
        this.loadBackgrounds();
    }

    async loadCategories() {
        try {
            this.categories = await backgroundCategoryService.getCategories();
            console.log('Loaded categories:', this.categories);

            // If no categories exist, show initialization message
            if (this.categories.length === 0) {
                console.log('No categories found, may need initialization');
            }

            this.renderCategoryDropdown();
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.showError('카테고리를 불러오는데 실패했습니다.');
        }
    }


    async loadBackgrounds() {
        this.isLoading = true;
        this.updateLoadingState(true);

        try {
            // Always load all backgrounds for accurate counts
            this.allBackgrounds = await backgroundService.getBackgrounds(null);

            // Filter for display
            if (this.selectedCategory === 'all') {
                this.backgrounds = this.allBackgrounds;
            } else {
                this.backgrounds = this.allBackgrounds.filter(
                    bg => bg.category === this.selectedCategory
                );
            }

            this.displayBackgrounds();

            // Update category dropdown with counts after loading backgrounds
            this.renderCategoryDropdown();
        } catch (error) {
            console.error('Failed to load backgrounds:', error);
            this.showError('배경 이미지를 불러오는데 실패했습니다.');
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    renderCategoryDropdown() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;

        // Calculate total count
        const totalCount = this.allBackgrounds.length;

        // Keep "전체 카테고리" option with count
        categoryFilter.innerHTML = `<option value="all">전체 카테고리 (${totalCount})</option>`;

        // Calculate image counts per category using all backgrounds
        const categoryCounts = {};
        this.allBackgrounds.forEach(bg => {
            const category = bg.category || '기타';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        // Add categories from Firebase with counts
        this.categories.forEach(cat => {
            const count = categoryCounts[cat.name] || 0;
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.displayName || cat.name} (${count})`;
            categoryFilter.appendChild(option);
        });
    }

    displayBackgrounds() {
        const backgroundsContainer = document.getElementById('backgroundsContainer');
        if (!backgroundsContainer) return;

        if (this.backgrounds.length === 0) {
            backgroundsContainer.innerHTML = `
                <div class="empty-state">
                    <p>등록된 배경 이미지가 없습니다.</p>
                </div>
            `;
            return;
        }

        const backgroundsHTML = this.backgrounds.map(bg => `
            <tr class="background-row" data-id="${bg.id}">
                <td>${bg.category}</td>
                <td>${bg.displayName}</td>
                <td class="thumbnail-cell">
                    <img 
                        src="${bg.thumbnailUrl || bg.url}" 
                        alt="${bg.displayName}"
                        class="thumbnail-img"
                        data-full-url="${bg.url}"
                    >
                    <div class="preview-popup">
                        <img src="${bg.url}" alt="${bg.displayName}">
                    </div>
                </td>
                <td class="filename-cell">${bg.fileName}</td>
                <td>${this.formatFileSize(bg.size)}</td>
                <td class="action-cell">
                    <button class="btn-delete" data-id="${bg.id}">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </td>
            </tr>
        `).join('');

        backgroundsContainer.innerHTML = `
            <div class="backgrounds-table-container">
                <table class="backgrounds-table">
                    <thead>
                        <tr>
                            <th width="15%">카테고리</th>
                            <th width="25%">노출 이름</th>
                            <th width="15%">미리보기</th>
                            <th width="20%">파일명</th>
                            <th width="10%">용량</th>
                            <th width="15%">삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${backgroundsHTML}
                    </tbody>
                </table>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        // Thumbnail hover preview
        document.querySelectorAll('.thumbnail-img').forEach(img => {
            const previewPopup = img.nextElementSibling;
            
            img.addEventListener('mouseenter', (e) => {
                if (previewPopup) {
                    previewPopup.style.display = 'block';
                }
            });
            
            img.addEventListener('mouseleave', (e) => {
                if (previewPopup) {
                    previewPopup.style.display = 'none';
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('이 배경 이미지를 삭제하시겠습니까?')) {
                    await this.deleteBackground(id);
                }
            });
        });
    }

    async uploadBackground(file) {
        const modal = this.showUploadModal();
        
        modal.querySelector('#uploadForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const category = modal.querySelector('#categorySelect').value;
            const displayName = modal.querySelector('#displayNameInput').value;
            
            if (!category || !displayName) {
                alert('카테고리와 노출 이름을 입력해주세요.');
                return;
            }
            
            this.showLoading('업로드 중...');
            
            try {
                await backgroundService.uploadBackground(file, category, displayName);
                this.hideModal();
                this.showNotification('배경 이미지가 등록되었습니다!', 'success');
                await this.loadBackgrounds();
            } catch (error) {
                console.error('Upload failed:', error);
                this.showNotification('업로드에 실패했습니다.', 'error');
            } finally {
                this.hideLoading();
            }
        });
    }

    async deleteBackground(id) {
        this.showLoading('삭제 중...');
        
        try {
            await backgroundService.deleteBackground(id);
            this.showNotification('배경 이미지가 삭제되었습니다.', 'success');
            await this.loadBackgrounds();
        } catch (error) {
            console.error('Delete failed:', error);
            this.showNotification('삭제에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showUploadModal() {
        // Generate category options from Firebase
        const categoryOptions = this.categories.map(cat =>
            `<option value="${cat.name}">${cat.displayName || cat.name}</option>`
        ).join('');

        const modalHTML = `
            <div class="modal-overlay" id="uploadModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>배경 이미지 업로드</h2>
                        <button class="modal-close" onclick="window.backgroundsPage.hideModal()">×</button>
                    </div>
                    <form id="uploadForm" class="upload-form">
                        <div class="form-group">
                            <label class="form-label">카테고리</label>
                            <select id="categorySelect" class="form-select" required>
                                <option value="">선택하세요</option>
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">노출 이름</label>
                            <input type="text" id="displayNameInput" class="form-input" placeholder="예: 핑크 키링 배경" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" style="flex: 1; width: auto;" onclick="window.backgroundsPage.hideModal()">취소</button>
                            <button type="submit" class="btn btn-primary" style="flex: 3; width: auto;">업로드</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('uploadModal');
    }

    hideModal() {
        document.getElementById('uploadModal')?.remove();
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    showLoading(message) {
        const loadingHTML = `
            <div class="loading-overlay" id="loadingOverlay">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    hideLoading() {
        document.getElementById('loadingOverlay')?.remove();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e17055' : '#74b9ff'};
            color: white;
            font-size: 14px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    updateLoadingState(isLoading) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    ${message}
                </div>
            `;
            setTimeout(() => {
                errorContainer.innerHTML = '';
            }, 5000);
        }
    }

    render() {
        this.container.innerHTML = `
            <div class="dashboard-container">
                ${Sidebar.render('backgrounds')}
                
                <div class="main-content">
                    <div class="page-header">
                        <h1 class="page-title">배경 이미지 관리</h1>
                        <p class="page-subtitle">디자인 캔버스에서 사용할 배경 이미지를 관리합니다</p>
                    </div>
                    
                    <div class="controls-section">
                        <div class="filter-group">
                            <select id="categoryFilter" class="filter-select">
                                <option value="all">전체 카테고리</option>
                                <!-- Categories will be loaded dynamically -->
                            </select>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary" id="manageCategoriesBtn">
                                <i class="fas fa-cog"></i>
                                카테고리 관리
                            </button>
                            <button class="btn btn-primary" id="uploadBtn">
                                <i class="fas fa-upload"></i>
                                새 배경 이미지 업로드
                            </button>
                        </div>
                    </div>
                    
                    <input type="file" id="fileInput" accept="image/*" style="display: none;">
                    
                    <div id="errorContainer"></div>
                    <div id="loadingIndicator" style="display: none;">
                        <div class="spinner">로딩중...</div>
                    </div>
                    
                    <div id="backgroundsContainer" class="backgrounds-container">
                        <!-- Backgrounds will be loaded here -->
                    </div>
                </div>
            </div>
        `;
        
        Sidebar.attachEvents();
        window.backgroundsPage = this;
        
        // Attach initial event listeners after render
        this.attachInitialEventListeners();
    }
    
    attachInitialEventListeners() {
        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.loadBackgrounds();
        });

        // Manage categories button
        document.getElementById('manageCategoriesBtn')?.addEventListener('click', () => {
            this.showCategoryManagementModal();
        });

        // Upload button
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            console.log('Upload button clicked');
            document.getElementById('fileInput')?.click();
        });

        // File input change
        document.getElementById('fileInput')?.addEventListener('change', async (e) => {
            console.log('File selected');
            const file = e.target.files[0];
            if (file) {
                await this.uploadBackground(file);
                e.target.value = ''; // Reset input
            }
        });
    }

    showCategoryManagementModal() {
        // Calculate image counts per category
        const categoryCounts = {};
        this.allBackgrounds.forEach(bg => {
            const category = bg.category || '기타';
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        const categoriesHTML = this.categories.map((cat, index) => {
            const count = categoryCounts[cat.name] || 0;
            return `
                <div class="category-item" data-category-id="${cat.id}" draggable="true">
                    <div class="category-info">
                        <button class="btn-icon drag-handle" title="드래그하여 순서 변경">
                            <i class="fas fa-grip-vertical"></i>
                        </button>
                        <span class="category-order">${index + 1}</span>
                        <span class="category-name">${cat.displayName || cat.name}</span>
                        <span class="category-count">(${count}개)</span>
                    </div>
                    <div class="category-actions">
                        <button class="btn-icon" onclick="window.backgroundsPage.editCategory('${cat.id}')" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.backgroundsPage.deleteCategory('${cat.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const modalHTML = `
            <div class="modal-overlay" id="categoryModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>배경 카테고리 관리</h2>
                        <button class="modal-close" onclick="window.backgroundsPage.hideCategoryModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="category-list" id="categoryList">
                            ${categoriesHTML}
                        </div>
                        <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="window.backgroundsPage.showAddCategoryForm()">
                            <i class="fas fa-plus"></i>
                            새 카테고리 추가
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;

        let draggedElement = null;

        categoryList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('category-item')) {
                draggedElement = e.target;
                e.target.style.opacity = '0.5';
            }
        });

        categoryList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('category-item')) {
                e.target.style.opacity = '1';
            }
        });

        categoryList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(categoryList, e.clientY);
            if (afterElement == null) {
                categoryList.appendChild(draggedElement);
            } else {
                categoryList.insertBefore(draggedElement, afterElement);
            }
        });

        categoryList.addEventListener('drop', async (e) => {
            e.preventDefault();
            await this.saveCategoryOrder();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.category-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async saveCategoryOrder() {
        const categoryList = document.getElementById('categoryList');
        if (!categoryList) return;

        const categoryItems = categoryList.querySelectorAll('.category-item');
        const categoryIds = Array.from(categoryItems).map(item => item.dataset.categoryId);

        this.showLoading('카테고리 순서 저장 중...');

        try {
            await backgroundCategoryService.reorderCategories(categoryIds);
            this.showNotification('카테고리 순서가 저장되었습니다!', 'success');

            // Reload categories to update order numbers
            await this.loadCategories();

            // Update the modal
            this.hideCategoryModal();
            this.showCategoryManagementModal();
        } catch (error) {
            console.error('Save category order failed:', error);
            this.showNotification('순서 저장에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    hideCategoryModal() {
        document.getElementById('categoryModal')?.remove();
    }

    showAddCategoryForm() {
        const formHTML = `
            <div class="modal-overlay" id="addCategoryModal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>새 카테고리 추가</h2>
                        <button class="modal-close" onclick="window.backgroundsPage.hideAddCategoryModal()">×</button>
                    </div>
                    <form id="addCategoryForm" class="upload-form">
                        <div class="form-group">
                            <label class="form-label">카테고리 이름</label>
                            <input type="text" id="categoryNameInput" class="form-input" placeholder="예: 키링" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">표시 이름 (선택사항)</label>
                            <input type="text" id="categoryDisplayNameInput" class="form-input" placeholder="예: 키링">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="window.backgroundsPage.hideAddCategoryModal()">취소</button>
                            <button type="submit" class="btn btn-primary" style="flex: 1;">추가</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);

        document.getElementById('addCategoryForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addCategory();
        });
    }

    hideAddCategoryModal() {
        document.getElementById('addCategoryModal')?.remove();
    }

    async addCategory() {
        const nameInput = document.getElementById('categoryNameInput');
        const displayNameInput = document.getElementById('categoryDisplayNameInput');

        const name = nameInput?.value.trim();
        const displayName = displayNameInput?.value.trim() || name;

        if (!name) {
            alert('카테고리 이름을 입력해주세요.');
            return;
        }

        this.showLoading('카테고리 추가 중...');

        try {
            await backgroundCategoryService.createCategory({
                name,
                displayName
            });

            this.hideAddCategoryModal();
            this.hideCategoryModal();
            this.showNotification('카테고리가 추가되었습니다!', 'success');
            await this.loadCategories();
        } catch (error) {
            console.error('Add category failed:', error);
            this.showNotification('카테고리 추가에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (!category) return;

        const formHTML = `
            <div class="modal-overlay" id="editCategoryModal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>카테고리 수정</h2>
                        <button class="modal-close" onclick="window.backgroundsPage.hideEditCategoryModal()">×</button>
                    </div>
                    <form id="editCategoryForm" class="upload-form">
                        <div class="form-group">
                            <label class="form-label">카테고리 이름</label>
                            <input type="text" id="editCategoryNameInput" class="form-input" value="${category.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">표시 이름</label>
                            <input type="text" id="editCategoryDisplayNameInput" class="form-input" value="${category.displayName || category.name}" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="window.backgroundsPage.hideEditCategoryModal()">취소</button>
                            <button type="submit" class="btn btn-primary" style="flex: 1;">수정</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHTML);

        document.getElementById('editCategoryForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateCategory(categoryId);
        });
    }

    hideEditCategoryModal() {
        document.getElementById('editCategoryModal')?.remove();
    }

    async updateCategory(categoryId) {
        const nameInput = document.getElementById('editCategoryNameInput');
        const displayNameInput = document.getElementById('editCategoryDisplayNameInput');

        const name = nameInput?.value.trim();
        const displayName = displayNameInput?.value.trim();

        if (!name || !displayName) {
            alert('모든 필드를 입력해주세요.');
            return;
        }

        this.showLoading('카테고리 수정 중...');

        try {
            await backgroundCategoryService.updateCategory(categoryId, {
                name,
                displayName
            });

            this.hideEditCategoryModal();
            this.hideCategoryModal();
            this.showNotification('카테고리가 수정되었습니다!', 'success');
            await this.loadCategories();
        } catch (error) {
            console.error('Update category failed:', error);
            this.showNotification('카테고리 수정에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('이 카테고리를 삭제하시겠습니까?')) {
            return;
        }

        this.showLoading('카테고리 삭제 중...');

        try {
            await backgroundCategoryService.deleteCategory(categoryId);

            this.hideCategoryModal();
            this.showNotification('카테고리가 삭제되었습니다!', 'success');
            await this.loadCategories();
        } catch (error) {
            console.error('Delete category failed:', error);
            this.showNotification('카테고리 삭제에 실패했습니다.', 'error');
        } finally {
            this.hideLoading();
        }
    }
}