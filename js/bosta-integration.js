{
  "status": "✅ SaaS OMS Backend Active",
  "version": "2.3.0",
  "timestamp": "2026-08-05T23:23:29.814Z",
  "project": "orders-8f568",
  "database": {
    "type": "Firebase Realtime Database",
    "url": "https://orders-8f568-default-rtdb.firebaseio.com"
  },
  "storage": {
    "type": "Cloudflare R2",
    "bucket": "orders"
  },
  "bosta": {
    "configured": true
  },
  "endpoints": {
    "health": {
      "method": "GET",
      "path": "/api/health"
    },
    "storage": {
      "method": "GET, POST, PUT, DELETE",
      "path": "/api/storage/:key"
    },
    "upload": {
      "method": "POST",
      "path": "/api/upload"
    },
    "imageUpload": {
      "method": "POST",
      "path": "/api/images/upload"
    },
    "orders": {
      "method": "GET, POST, PUT, DELETE",
      "path": "/api/orders/:id?"
    },
    "products": {
      "method": "GET, POST, PUT, DELETE",
      "path": "/api/products/:id?"
    },
    "customers": {
      "method": "GET, POST, PUT, DELETE",
      "path": "/api/customers/:id?"
    },
    "analytics": {
      "method": "GET",
      "path": "/api/analytics"
    },
    "export": {
      "method": "GET",
      "path": "/api/export"
    },
    "bosta": {
      "createShipment": {
        "method": "POST",
        "path": "/api/bosta/create-shipment"
      },
      "track": {
        "method": "GET",
        "path": "/api/bosta/track/:trackingNumber"
      },
      "getDelivery": {
        "method": "GET",
        "path": "/api/bosta/delivery/:deliveryId"
      },
      "updateDelivery": {
        "method": "PUT",
        "path": "/api/bosta/delivery/:deliveryId"
      },
      "terminateDelivery": {
        "method": "DELETE",
        "path": "/api/bosta/delivery/:deliveryId"
      },
      "listDeliveries": {
        "method": "GET",
        "path": "/api/bosta/deliveries"
      },
      "customers": {
        "method": "GET",
        "path": "/api/bosta/customers"
      },
      "cities": {
        "method": "GET",
        "path": "/api/bosta/cities"
      },
      "zones": {
        "method": "GET",
        "path": "/api/bosta/zones/:cityId"
      },
      "pickupLocations": {
        "method": "GET, POST",
        "path": "/api/bosta/pickup-locations"
      },
      "pricing": {
        "method": "POST",
        "path": "/api/bosta/pricing"
      },
      "account": {
        "method": "GET",
        "path": "/api/bosta/account"
      },
      "webhook": {
        "method": "POST",
        "path": "/api/bosta/webhook"
      }
    }
  }
}