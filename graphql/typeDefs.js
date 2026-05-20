const { gql } = require('graphql-tag');

const typeDefs = gql`

  # ── TYPES ──────────────────────────────────────────────────

  type User {
    id:        Int
    name:      String
    email:     String
    role:      String
    createdAt: String
  }

  type Product {
    id:             Int
    name:           String
    description:    String
    price:          Float
    stock_quantity: Int
    stream_id:      Int
    is_flash_deal:  Boolean
    flash_price:    Float
    flash_ends_at:  String
    stream:         Stream
  }

  type Order {
    id:          Int
    quantity:    Int
    total_price: Float
    status:      String
    createdAt:   String
    product:     Product
    stream:      Stream
    buyer:       User
  }

  type Stream {
    id:           Int
    title:        String
    description:  String
    status:       String
    viewer_count: Int
    createdAt:    String
    seller:       User
    products:     [Product]
    orders:       [Order]
  }

  # Returned when placing an order via mutation
  type OrderResult {
    message:         String
    order:           Order
    used_flash_deal: Boolean
  }

  # Returned for auth mutations
  type AuthResult {
    message: String
    token:   String
    user:    User
  }

  # ── QUERIES ────────────────────────────────────────────────
  # Queries = read operations (like GET in REST)

  type Query {
    # Get all streams — optional status filter
    streams(status: String): [Stream]

    # Get one stream by ID
    stream(id: Int!): Stream

    # Get products for a stream
    products(streamId: Int!): [Product]

    # Get a single product
    product(id: Int!): Product

    # Get logged-in user's orders (requires auth)
    myOrders: [Order]

    # Get orders for a stream (seller only)
    streamOrders(streamId: Int!): [Order]

    # Get current logged-in user
    me: User
  }

  # ── MUTATIONS ──────────────────────────────────────────────
  # Mutations = write operations (like POST/PATCH/DELETE in REST)

  type Mutation {
    # Auth
    register(name: String!, email: String!, password: String!, role: String): AuthResult
    login(email: String!, password: String!): AuthResult

    # Streams
    createStream(title: String!, description: String): Stream
    updateStreamStatus(id: Int!, status: String!): Stream
    deleteStream(id: Int!): Stream

    # Products
    addProduct(
      name:           String!
      description:    String
      price:          Float!
      stock_quantity: Int
      stream_id:      Int!
    ): Product

    setFlashDeal(
      productId:     Int!
      flash_price:   Float!
      flash_ends_at: String!
    ): Product

    # Orders
    placeOrder(product_id: Int!, quantity: Int): OrderResult
  }
`;

module.exports = typeDefs;