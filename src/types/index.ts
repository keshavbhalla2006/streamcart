import { Request } from 'express';

// ── USER TYPES ────────────────────────────────────────────────

export type UserRole = 'buyer' | 'seller';

export interface IUser {
  id:            number;
  name:          string;
  email:         string;
  password_hash: string;
  role:          UserRole;
  createdAt:     Date;
  updatedAt:     Date;
}

// Payload stored inside the JWT token
export interface IJwtPayload {
  id:   number;
  role: UserRole;
  name: string;
  iat?: number;   // issued at  (added by jwt.sign automatically)
  exp?: number;   // expires at (added by jwt.sign automatically)
}

// Express Request extended with our user (set by authMiddleware)
export interface AuthRequest extends Request {
  user?: IJwtPayload;
}

// ── STREAM TYPES ──────────────────────────────────────────────

export type StreamStatus = 'scheduled' | 'live' | 'ended';

export interface IStream {
  id:           number;
  title:        string;
  description:  string;
  status:       StreamStatus;
  viewer_count: number;
  seller_id:    number;
  createdAt:    Date;
  updatedAt:    Date;
}

// ── PRODUCT TYPES ─────────────────────────────────────────────

export interface IProduct {
  id:             number;
  name:           string;
  description:    string;
  price:          number;
  stock_quantity: number;
  stream_id:      number;
  is_flash_deal:  boolean;
  flash_price:    number | null;
  flash_ends_at:  Date   | null;
  createdAt:      Date;
  updatedAt:      Date;
}

// ── ORDER TYPES ───────────────────────────────────────────────

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

export interface IOrder {
  id:          number;
  buyer_id:    number;
  product_id:  number;
  stream_id:   number;
  quantity:    number;
  total_price: number;
  status:      OrderStatus;
  createdAt:   Date;
  updatedAt:   Date;
}

// ── REQUEST BODY TYPES ────────────────────────────────────────
// These type-check what the client is allowed to send

export interface RegisterBody {
  name:     string;
  email:    string;
  password: string;
  role?:    UserRole;
}

export interface LoginBody {
  email:    string;
  password: string;
}

export interface CreateStreamBody {
  title:        string;
  description?: string;
}

export interface UpdateStatusBody {
  status: StreamStatus;
}

export interface CreateProductBody {
  name:           string;
  description?:   string;
  price:          number;
  stock_quantity?: number;
  stream_id:      number;
}

export interface FlashDealBody {
  flash_price:   number;
  flash_ends_at: string;
}

export interface PlaceOrderBody {
  product_id: number;
  quantity?:  number;
}

// ── API RESPONSE TYPE ─────────────────────────────────────────
// Standardises what every route returns

export interface ApiResponse<T = unknown> {
  message?: string;
  error?:   string;
  data?:    T;
}