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
            console.log('Tokens expired, attempting to refresh...');
            const refreshSuccess = await this.refreshAccessToken();

            if (refreshSuccess) {
                const newTokens = await this.tokenService.getTokens();
                if (newTokens && !newTokens.expired) {
                    this.accessToken = newTokens.accessToken;
                    this.refreshToken = newTokens.refreshToken;
                    return true;
                }
            }

            // Refresh failed, return false to prompt re-authentication
            return false;
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
            const refreshSuccess = await this.refreshAccessToken();
            if (refreshSuccess) {
                const newTokens = await this.tokenService.getTokens();
                return newTokens.accessToken;
            }
            // Refresh failed
            throw new Error('Token expired and refresh failed. Please re-authenticate.');
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
                console.log('No refresh token available, clearing tokens...');
                await this.clearTokens();
                return false;
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
                console.log('Token refresh failed, clearing tokens and requiring re-authentication...');
                await this.clearTokens();
                return false;
            }

            const data = await response.json();
            await this.setTokens(data.access_token, data.refresh_token, data.expires_in || 7200);
            console.log('Token refreshed successfully');
            return true;
        } catch (error) {
            console.log('Token refresh error, clearing tokens:', error.message);
            await this.clearTokens();
            return false;
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
                const refreshSuccess = await this.refreshAccessToken();
                if (refreshSuccess) {
                    return await this.makeApiRequest(endpoint, options);
                }
                // Refresh failed, throw error to prompt re-authentication
                throw new Error('Authentication failed. Please re-authenticate with Cafe24.');
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
        console.log('[Cafe24 API] Requesting specific categories');

        // 지정된 카테고리 번호들만 조회
        const categoryNos = [424, 381, 121, 124, 129, 128, 155, 318, 127];
        const categories = [];

        // 각 카테고리 번호별로 개별 조회
        for (let i = 0; i < categoryNos.length; i++) {
            const categoryNo = categoryNos[i];
            try {
                const endpoint = `/admin/categories/${categoryNo}`;
                const response = await this.makeApiRequest(endpoint);

                if (response.category) {
                    categories.push(response.category);
                }

                // API 제한 방지를 위한 짧은 지연 (마지막 항목이 아닐 때만)
                if (i < categoryNos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.warn(`[Cafe24 API] Failed to fetch category ${categoryNo}:`, error.message);
            }
        }

        console.log('[Cafe24 API] Categories response:', {
            totalCount: categories.length,
            hasCategories: categories.length > 0,
            categoryNos: categoryNos
        });

        if (categories.length > 0) {
            console.log('[Cafe24 API] Categories list:', categories.map(c => ({
                no: c.category_no,
                name: c.category_name,
                depth: c.category_depth
            })));
        }

        return categories;
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

    async getProductsByCategory(categoryNo, additionalParams = {}) {
        console.log('[Cafe24 API] Fetching products for category:', categoryNo, 'with params:', additionalParams);

        // /admin/products API에 category 파라미터를 사용하여 한 번에 조회
        // 100개씩 페이지네이션으로 조회
        let allProducts = [];
        let offset = 0;
        const limit = 100; // Cafe24 API 최대 limit

        while (true) {
            const queryParams = new URLSearchParams({
                category: categoryNo,
                display: 'T',
                selling: 'T',
                limit: limit,
                offset: offset
            });

            // 추가 검색 파라미터 (상품명, 상품코드 등)
            if (additionalParams.product_name) {
                queryParams.append('product_name', additionalParams.product_name);
            }
            if (additionalParams.product_code) {
                queryParams.append('product_code', additionalParams.product_code);
            }
            if (additionalParams.product_no) {
                queryParams.append('product_no', additionalParams.product_no);
            }

            const endpoint = `/admin/products?${queryParams.toString()}`;
            console.log(`[Cafe24 API] Fetching products (offset: ${offset}, limit: ${limit})`);

            try {
                const response = await this.makeApiRequest(endpoint);
                const products = response.products || [];

                console.log(`[Cafe24 API] Retrieved ${products.length} products`);

                if (products.length === 0) {
                    // 더 이상 제품이 없으면 종료
                    break;
                }

                allProducts = allProducts.concat(products);

                // 100개 미만이면 마지막 페이지
                if (products.length < limit) {
                    break;
                }

                // 다음 페이지로
                offset += limit;

                // API 제한 방지를 위한 짧은 지연
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error(`[Cafe24 API] Failed to fetch products at offset ${offset}:`, err);
                break;
            }
        }

        console.log('[Cafe24 API] Successfully loaded', allProducts.length, 'products for category', categoryNo);

        return allProducts;
    }
}

export const cafe24Api = new Cafe24ApiService();