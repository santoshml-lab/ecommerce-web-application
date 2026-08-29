from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from typing import Optional
import os


# =====================================================
# APP
# =====================================================

app = FastAPI(
    title="E-Commerce API",
    description="Full-stack E-Commerce Web Application API",
    version="1.0.0"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# SUPABASE CONFIGURATION
# =====================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required"
    )

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)


# =====================================================
# MODELS
# =====================================================

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    stock: int = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    items: list[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: str


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/")
def home():

    return {
        "message": "E-Commerce API is running 🚀",
        "status": "success"
    }


# =====================================================
# AUTHENTICATION
# =====================================================

def get_current_user(authorization: Optional[str]):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format"
        )

    token = authorization.replace("Bearer ", "").strip()

    try:

        response = supabase.auth.get_user(token)

        user = response.user

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )

        return user

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


# =====================================================
# ADMIN CHECK
# =====================================================

def check_admin(user):

    admin_user_ids = os.getenv(
        "ADMIN_USER_IDS",
        ""
    ).split(",")

    admin_user_ids = [
        user_id.strip()
        for user_id in admin_user_ids
        if user_id.strip()
    ]

    if str(user.id) not in admin_user_ids:

        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return True


# =====================================================
# PRODUCTS
# =====================================================

@app.get("/products")
def get_products():

    try:

        response = (
            supabase
            .table("products")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "products": response.data
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# GET SINGLE PRODUCT
# =====================================================

@app.get("/products/{product_id}")
def get_product(product_id: int):

    try:

        response = (
            supabase
            .table("products")
            .select("*")
            .eq("id", product_id)
            .single()
            .execute()
        )

        if not response.data:

            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        return response.data

    except HTTPException:
        raise

    except Exception:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )


# =====================================================
# CREATE PRODUCT - ADMIN
# =====================================================

@app.post("/products")
def create_product(
    product: ProductCreate,
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    check_admin(user)

    try:

        response = (
            supabase
            .table("products")
            .insert(product.model_dump())
            .execute()
        )

        return {
            "message": "Product created successfully",
            "product": response.data[0]
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# UPDATE PRODUCT - ADMIN
# =====================================================

@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    product: ProductUpdate,
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    check_admin(user)

    update_data = {
        key: value
        for key, value in product.model_dump().items()
        if value is not None
    }

    if not update_data:

        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    try:

        response = (
            supabase
            .table("products")
            .update(update_data)
            .eq("id", product_id)
            .execute()
        )

        if not response.data:

            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        return {
            "message": "Product updated successfully",
            "product": response.data[0]
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# DELETE PRODUCT - ADMIN
# =====================================================

@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    check_admin(user)

    try:

        response = (
            supabase
            .table("products")
            .delete()
            .eq("id", product_id)
            .execute()
        )

        return {
            "message": "Product deleted successfully"
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# CREATE ORDER
# =====================================================

@app.post("/orders")
def create_order(
    order: OrderCreate,
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    if not order.items:

        raise HTTPException(
            status_code=400,
            detail="Cart is empty"
        )

    try:

        total_amount = 0
        order_items_data = []

        # ---------------------------------------------
        # Validate products
        # ---------------------------------------------

        for item in order.items:

            if item.quantity <= 0:

                raise HTTPException(
                    status_code=400,
                    detail="Quantity must be greater than zero"
                )

            product_response = (
                supabase
                .table("products")
                .select("*")
                .eq("id", item.product_id)
                .single()
                .execute()
            )

            product = product_response.data

            if not product:

                raise HTTPException(
                    status_code=404,
                    detail=f"Product {item.product_id} not found"
                )

            if product["stock"] < item.quantity:

                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough stock for {product['name']}"
                )

            price = float(product["price"])

            total_amount += price * item.quantity

            order_items_data.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": price
            })

        # ---------------------------------------------
        # Create order
        # ---------------------------------------------

        order_response = (
            supabase
            .table("orders")
            .insert({
                "user_id": str(user.id),
                "total_amount": total_amount,
                "status": "pending"
            })
            .execute()
        )

        if not order_response.data:

            raise HTTPException(
                status_code=500,
                detail="Failed to create order"
            )

        created_order = order_response.data[0]

        order_id = created_order["id"]

        # ---------------------------------------------
        # Add order items
        # ---------------------------------------------

        for item in order_items_data:

            item["order_id"] = order_id

        supabase \
            .table("order_items") \
            .insert(order_items_data) \
            .execute()

        # ---------------------------------------------
        # Update stock
        # ---------------------------------------------

        for item in order.items:

            product_response = (
                supabase
                .table("products")
                .select("stock")
                .eq("id", item.product_id)
                .single()
                .execute()
            )

            current_stock = product_response.data["stock"]

            new_stock = current_stock - item.quantity

            supabase \
                .table("products") \
                .update({
                    "stock": new_stock
                }) \
                .eq("id", item.product_id) \
                .execute()

        return {
            "message": "Order created successfully",
            "order": created_order
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# GET MY ORDERS
# =====================================================

@app.get("/orders")
def get_my_orders(
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    try:

        response = (
            supabase
            .table("orders")
            .select(
                "*, order_items(*)"
            )
            .eq("user_id", str(user.id))
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "orders": response.data
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# GET SINGLE ORDER
# =====================================================

@app.get("/orders/{order_id}")
def get_order(
    order_id: int,
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    try:

        response = (
            supabase
            .table("orders")
            .select(
                "*, order_items(*)"
            )
            .eq("id", order_id)
            .eq("user_id", str(user.id))
            .single()
            .execute()
        )

        if not response.data:

            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        return response.data

    except HTTPException:
        raise

    except Exception:

        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )


# =====================================================
# ADMIN - ALL ORDERS
# =====================================================

@app.get("/admin/orders")
def get_all_orders(
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    check_admin(user)

    try:

        response = (
            supabase
            .table("orders")
            .select(
                "*, order_items(*)"
            )
            .order("created_at", desc=True)
            .execute()
        )

        return {
            "orders": response.data
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# ADMIN - UPDATE ORDER STATUS
# =====================================================

@app.put("/admin/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    authorization: Optional[str] = Header(None)
):

    user = get_current_user(authorization)

    check_admin(user)

    allowed_statuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
    ]

    if status_data.status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail="Invalid order status"
        )

    try:

        response = (
            supabase
            .table("orders")
            .update({
                "status": status_data.status
            })
            .eq("id", order_id)
            .execute()
        )

        if not response.data:

            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        return {
            "message": "Order status updated successfully",
            "order": response.data[0]
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =====================================================
# RUN LOCALLY
# =====================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
      )
