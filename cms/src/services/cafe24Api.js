import { cafe24Config, getCafe24ApiUrl } from '../config/cafe24.js';
import { cafe24TokenService } from './cafe24TokenService.js';

class Cafe24ApiService {
    constructor() {
        this.shopId = cafe24Config.shopId;
        this.tokenService = cafe24TokenService;
    }

    async setTokens(accessToken, refreshToken, expiresIn = 7200) {
        await this.tokenService.saveTokens(accessToken, refreshToken, expiresIn);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    async clearTokens() {
        await this.tokenService.deleteTokens();
        this.accessToken = null;
        this.refreshToken = null;
    }

    async isAuthenticated() {
        const tokens = await this.tokenService.getTokens();
        
        if (!tokens) {
            return false;
        }
        
        // If tokens exist but are expired, try to refresh
        if (tokens.expired && tokens.refreshToken) {
            try {
                console.log('Tokens expired, attempting to refresh...');
                await this.refreshAccessToken();
                const newTokens = await this.tokenService.getTokens();
                if (newTokens && !newTokens.expired) {
                    this.accessToken = newTokens.accessToken;
                    this.refreshToken = newTokens.refreshToken;
                    return true;
                }
            } catch (error) {
                console.error('Failed to refresh token:', error);
                return false;
            }
        }
        
        // Tokens exist and are not expired
        if (!tokens.expired) {
            this.accessToken = tokens.accessToken;
            this.refreshToken = tokens.refreshToken;
            return true;
        }
        
        return false;
    }

    async getAccessToken() {
        const tokens = await this.tokenService.getTokens();
        
        if (!tokens) {
            throw new Error('Not authenticated with Cafe24');
        }

        if (tokens.expired && tokens.refreshToken) {
            // 토큰이 만료되면 자동으로 갱신
            await this.refreshAccessToken();
            const newTokens = await this.tokenService.getTokens();
            return newTokens.accessToken;
        }

        return tokens.accessToken;
    }

    async exchangeCodeForToken(code) {
        try {
            console.log('Exchanging code for token...');

            // Vercel 서버리스 함수를 통해 토큰 교환
            const response = await fetch('/api/auth/cafe24/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: cafe24Config.clientId,
                    client_secret: cafe24Config.clientSecret,
                    redirect_uri: cafe24Config.redirectUri
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Token exchange failed:', data);
                throw new Error(data.error_description || 'Failed to exchange code for token');
            }

            console.log('Token exchange successful');
            await this.setTokens(data.access_token, data.refresh_token, data.expires_in || 7200);
            return data;
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const tokens = await this.tokenService.getTokens();
            
            if (!tokens || !tokens.refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch('/api/auth/cafe24/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: tokens.refreshToken,
                    client_id: cafe24Config.clientId,
                    client_secret: cafe24Config.clientSecret
                })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            await this.setTokens(data.access_token, data.refresh_token, data.expires_in || 7200);
            return data;
        } catch (error) {
            console.error('Token refresh error:', error);
            await this.clearTokens();
            throw error;
        }
    }

    async makeApiRequest(endpoint, options = {}) {
        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
            throw new Error('Not authenticated with Cafe24');
        }

        const accessToken = await this.getAccessToken();
        
        // 프로덕션과 로컬 환경 구분
        const isProduction = window.location.hostname !== 'localhost';
        
        try {
            let response;
            
            if (isProduction || true) { // 항상 프록시 사용 (CORS 회피)
                // Vercel API 프록시 사용
                const proxyUrl = '/api/cafe24/proxy';
                
                if (options.method === 'GET' || !options.method) {
                    // GET 요청
                    const params = new URLSearchParams({ endpoint });
                    response = await fetch(`${proxyUrl}?${params.toString()}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } else {
                    // POST, PUT, DELETE 요청
                    response = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            endpoint,
                            method: options.method,
                            body: options.body ? JSON.parse(options.body) : undefined
                        })
                    });
                }
            } else {
                // 직접 호출 (로컬 테스트용 - 실제로는 CORS 때문에 작동 안함)
                const url = getCafe24ApiUrl(endpoint);
                const headers = {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Cafe24-Api-Version': cafe24Config.apiVersion,
                    ...options.headers
                };
                
                response = await fetch(url, {
                    ...options,
                    headers
                });
            }

            if (response.status === 401) {
                // 토큰이 만료되었으면 갱신 후 재시도
                await this.refreshAccessToken();
                return await this.makeApiRequest(endpoint, options);
            }

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: response.statusText };
                }
                
                console.error('API request failed:', {
                    status: response.status,
                    error: errorData
                });
                
                const errorMessage = errorData.message || errorData.error_description || errorData.error || `API request failed: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    async getProducts(params = {}) {
        const queryParams = new URLSearchParams({
            display: params.display || 'T',
            selling: params.selling || 'T',
            limit: params.limit || 100,
            offset: params.offset || 0
        });

        // 추가 파라미터 처리
        if (params.product_name) {
            queryParams.append('product_name', params.product_name);
        }
        if (params.product_code) {
            queryParams.append('product_code', params.product_code);
        }
        if (params.product_no) {
            queryParams.append('product_no', params.product_no);
        }

        const endpoint = `/admin/products?${queryParams.toString()}`;
        console.log('[Cafe24 API] Requesting products with endpoint:', endpoint);
        console.log('[Cafe24 API] Request params:', params);

        const response = await this.makeApiRequest(endpoint);

        console.log('[Cafe24 API] Products response:', {
            totalCount: response.products ? response.products.length : 0,
            hasProducts: !!response.products,
            responseKeys: Object.keys(response)
        });

        if (response.products && response.products.length > 0) {
            console.log('[Cafe24 API] Sample product (first):', response.products[0]);
            console.log('[Cafe24 API] Product numbers:', response.products.map(p => p.product_no));
        }

        return response.products || [];
    }

    async getProduct(productNo) {
        const endpoint = `/admin/products/${productNo}`;
        const response = await this.makeApiRequest(endpoint);
        return response.product;
    }

    async getProductInventory(productNo) {
        const endpoint = `/admin/products/${productNo}/inventories`;
        const response = await this.makeApiRequest(endpoint);
        return response.inventories || [];
    }

    async getProductImages(productNo) {
        const endpoint = `/admin/products/${productNo}/images`;
        const response = await this.makeApiRequest(endpoint);
        return response.images || [];
    }

    async getCategories() {
        const endpoint = '/admin/categories?limit=100';  // limit 증가
        console.log('[Cafe24 API] Requesting categories');

        const response = await this.makeApiRequest(endpoint);

        console.log('[Cafe24 API] Categories response:', {
            totalCount: response.categories ? response.categories.length : 0,
            hasCategories: !!response.categories,
            responseKeys: Object.keys(response)
        });

        if (response.categories && response.categories.length > 0) {
            console.log('[Cafe24 API] Categories list:', response.categories.map(c => ({
                no: c.category_no,
                name: c.category_name,
                depth: c.category_depth
            })));
        }

        return response.categories || [];
    }

    async getCategory(categoryNo) {
        const endpoint = `/admin/categories/${categoryNo}`;
        const response = await this.makeApiRequest(endpoint);
        return response.category;
    }

    async createCategory(categoryData) {
        const endpoint = '/admin/categories';
        const response = await this.makeApiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                shop_no: this.shopId,
                category: categoryData
            })
        });
        return response.category;
    }

    async updateCategory(categoryNo, categoryData) {
        const endpoint = `/admin/categories/${categoryNo}`;
        const response = await this.makeApiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                shop_no: this.shopId,
                category: categoryData
            })
        });
        return response.category;
    }

    async deleteCategory(categoryNo) {
        const endpoint = `/admin/categories/${categoryNo}`;
        await this.makeApiRequest(endpoint, {
            method: 'DELETE'
        });
        return true;
    }

    async createProduct(productData) {
        const endpoint = '/admin/products';
        const response = await this.makeApiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                shop_no: this.shopId,
                product: productData
            })
        });
        return response.product;
    }

    async updateProduct(productNo, productData) {
        const endpoint = `/admin/products/${productNo}`;
        const response = await this.makeApiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                shop_no: this.shopId,
                product: productData
            })
        });
        return response.product;
    }

    async deleteProduct(productNo) {
        const endpoint = `/admin/products/${productNo}`;
        await this.makeApiRequest(endpoint, {
            method: 'DELETE'
        });
        return true;
    }

    async updateProductPrice(productNo, priceData) {
        const endpoint = `/admin/products/${productNo}/price`;
        const response = await this.makeApiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                shop_no: this.shopId,
                ...priceData
            })
        });
        return response;
    }

    async updateProductDisplay(productNo, display) {
        const endpoint = `/admin/products/${productNo}/display`;
        const response = await this.makeApiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                shop_no: this.shopId,
                display: display ? 'T' : 'F'
            })
        });
        return response;
    }

    async updateProductSelling(productNo, selling) {
        const endpoint = `/admin/products/${productNo}/selling`;
        const response = await this.makeApiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                shop_no: this.shopId,
                selling: selling ? 'T' : 'F'
            })
        });
        return response;
    }

    async updateProductStock(productNo, variantCode, quantity) {
        const endpoint = `/admin/products/${productNo}/variants/${variantCode}/inventory`;
        const response = await this.makeApiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                shop_no: this.shopId,
                stock_quantity: quantity
            })
        });
        return response;
    }

    async searchProducts(keyword) {
        const params = {
            product_name: keyword
        };
        return await this.getProducts(params);
    }

    async getCategoryProducts(categoryNo) {
        const endpoint = `/admin/categories/${categoryNo}/products?display_group=1`;
        const response = await this.makeApiRequest(endpoint);
        return response.products || [];
    }

    async getProductsByCategory(categoryNo) {
        console.log('[Cafe24 API] Fetching products for category:', categoryNo);

        // 1. 카테고리에 속한 상품 번호 목록 조회
        const categoryProducts = await this.getCategoryProducts(categoryNo);

        console.log('[Cafe24 API] Category products count:', categoryProducts.length);
        console.log('[Cafe24 API] Category product numbers:', categoryProducts.map(p => p.product_no));

        if (categoryProducts.length === 0) {
            console.log('[Cafe24 API] No products found in category:', categoryNo);
            return [];
        }

        // 2. 각 상품의 상세 정보를 병렬로 조회
        console.log('[Cafe24 API] Fetching detailed info for', categoryProducts.length, 'products...');
        const productDetailsPromises = categoryProducts.map(item =>
            this.getProduct(item.product_no).catch(err => {
                console.error(`[Cafe24 API] Failed to fetch product ${item.product_no}:`, err);
                return null;
            })
        );

        const productDetails = await Promise.all(productDetailsPromises);

        // null 제거 (조회 실패한 상품)
        const validProducts = productDetails.filter(p => p !== null);
        const failedCount = productDetails.length - validProducts.length;

        if (failedCount > 0) {
            console.warn(`[Cafe24 API] ${failedCount} products failed to load`);
        }

        console.log('[Cafe24 API] Successfully loaded', validProducts.length, 'products');

        return validProducts;
    }
}

export const cafe24Api = new Cafe24ApiService();