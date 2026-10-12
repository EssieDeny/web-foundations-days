# Day 8 Assignment: TicketHub System Design

## 1. Requirements

TicketHub is a website where users browse concerts and events, select seats, purchase tickets, and view their orders.

### Functional Requirements

- Users can register, log in, and manage their accounts.
- Users can browse events and view event details.
- Users can view available, held, and sold seats for an event.
- Users can temporarily hold available seats while completing checkout.
- Users can pay for their orders and receive confirmation.
- Users can view their purchased tickets and order history.
- The system must release expired seat holds so other customers can purchase those seats.
- Users must not be able to purchase seats that have already been sold or held by another customer.

### Non-Functional Requirements

**Performance:** Event pages and seat maps should load quickly. Under normal traffic, most read requests should respond within approximately 500 milliseconds. During a major sale, the system should prioritize availability and correctness over maintaining the same response time for every request.

**Scalability:** The system must support 2 million registered users, normal daily traffic, and sudden increases in demand when popular concerts go on sale.

**Correctness and consistency:** A seat must never be sold to two different customers. Seat availability, holds, orders, and payments must be handled reliably.

**Fairness:** Customers should receive clear information about seat availability. Requests should be processed through a controlled queue during exceptionally busy sales, with rate limits to reduce automated abuse. A hold should have a fixed expiry time, and expired holds should not block other customers indefinitely.

**Availability and reliability:** The website should remain usable during traffic spikes. If a payment or other operation fails, the system should avoid creating duplicate orders or charging customers twice.

**Security:** Users must be authenticated before purchasing tickets or viewing private orders. Payment details should be handled by a trusted payment provider rather than stored directly in TicketHub's database.

## 2. Traffic Estimates

### Normal Daily Traffic

Given:

- Registered users: 2,000,000.
- Daily visitors: 50,000.
- Pages viewed per visitor: 10.
- Tickets sold daily: 5,000.

Total page views per day:

50,000 × 10 = 500,000 page views per day.

Average page requests per second:

500,000 ÷ 86,400 ≈ 5.8 requests per second.

For planning purposes, assume traffic during busy periods is ten times the daily average:

5.8 × 10 ≈ 58 page requests per second.

If each ticket sale represents one ticket, 5,000 tickets per day equals approximately 0.058 tickets sold per second on average. Actual sales are unevenly distributed, so checkout traffic can be much higher than this average.

### Popular Concert Sale

Given:

- People attempting to buy tickets: 200,000.
- Available seats: 20,000.
- Sale duration for this estimate: 10 minutes.

Average incoming customer attempts per second:

200,000 ÷ 600 ≈ 333 attempts per second.

The sale has ten potential customers for every available seat:

200,000 ÷ 20,000 = 10 customers per seat.

Only 10% of these customers can obtain a seat if each customer buys one seat and all seats are sold.

For capacity planning, assume each customer generates five requests during the sale, including event viewing, seat-map requests, hold attempts, checkout, and order confirmation.

Total requests:

200,000 × 5 = 1,000,000 requests.

Average request rate during the ten-minute period:

1,000,000 ÷ 600 ≈ 1,667 requests per second.

Actual traffic could be higher during the first seconds of the sale, so the system needs additional capacity and traffic protection.

### Comparison

| Metric                           |               Normal traffic |                                  Popular sale |
| -------------------------------- | ---------------------------: | --------------------------------------------: |
| Visitors or interested customers |               50,000 per day |                         200,000 in 10 minutes |
| Page views or estimated requests |       500,000 page views/day |                 1,000,000 requests/10 minutes |
| Average estimated request rate   |        5.8 page views/second |                         1,667 requests/second |
| Ticket availability              |       Normal daily inventory |                                  20,000 seats |
| Main concern                     | Efficient everyday operation | Sudden demand, fairness, and seat correctness |

The estimated request rate during the popular sale is approximately 287 times the average normal page-view rate. These figures are planning estimates, not measured production traffic.

## 3. API Design

The API uses REST-style HTTP endpoints. JSON is used for request and response bodies. Authentication is required for private account and purchase operations.

### 1. Browse Events

- Method: GET
- Endpoint: `/api/events`
- Purpose: Returns a paginated list of upcoming events.
- Example response: A list containing event IDs, names, dates, venues, and starting prices.

### 2. View Event Details

- Method: GET
- Endpoint: `/api/events/{eventId}`
- Purpose: Returns details about a particular concert or event.

### 3. View Seats

- Method: GET
- Endpoint: `/api/events/{eventId}/seats`
- Purpose: Returns the seats and their current availability states.
- Example states: AVAILABLE, HELD, SOLD.
- Note: Availability shown in the response is informative. A seat is not guaranteed until the server successfully creates a hold.

### 4. Hold Seats

- Method: POST
- Endpoint: `/api/events/{eventId}/holds`
- Purpose: Temporarily reserves one or more available seats for an authenticated customer.
- Example request:

{
"seatIds": [101, 102]
}

- Successful response: A hold ID, the selected seats, and an expiry time.
- Failure response: HTTP 409 Conflict if any requested seat is unavailable.
- Important: The server must atomically verify and hold all requested seats, or hold none of them.

### 5. Create an Order

- Method: POST
- Endpoint: `/api/orders`
- Purpose: Creates a pending order associated with a valid hold.
- Example request:

{
"holdId": "hold-123",
"idempotencyKey": "checkout-request-456"
}

- Successful response: An order ID and payment status.
- Important: The idempotency key prevents a retried request from accidentally creating duplicate orders.

### 6. Pay for an Order

- Method: POST
- Endpoint: `/api/orders/{orderId}/payments`
- Purpose: Starts payment through an external payment provider.
- Successful response: The current payment status and a payment reference.
- Important: The server verifies the payment provider's confirmation before marking the order as paid and the seats as sold.

### 7. View My Tickets

- Method: GET
- Endpoint: `/api/me/tickets`
- Purpose: Returns tickets belonging to the authenticated user.

### 8. View an Order

- Method: GET
- Endpoint: `/api/orders/{orderId}`
- Purpose: Returns the status and details of an order, after checking that the user owns it.

## 4. Data Model

TicketHub uses a relational database such as PostgreSQL because purchasing tickets requires reliable transactions, constraints, and consistent updates.

### Table 1: Users

| Column         | Purpose                       |
| -------------- | ----------------------------- |
| id (PK)        | Unique user identifier        |
| name           | Customer's name               |
| email (UNIQUE) | Login and contact email       |
| password_hash  | Securely stored password hash |
| created_at     | Account creation timestamp    |

### Table 2: Events

| Column     | Purpose                     |
| ---------- | --------------------------- |
| id (PK)    | Unique event identifier     |
| name       | Concert or event name       |
| venue      | Event venue                 |
| event_date | Date and time of the event  |
| status     | DRAFT, ON_SALE, or SOLD_OUT |

### Table 3: Seats

Each row represents a physical seat for a specific event.

| Column                         | Purpose                               |
| ------------------------------ | ------------------------------------- |
| id (PK)                        | Unique seat identifier                |
| event_id (FK)                  | References Events.id                  |
| seat_number                    | Seat label within the event           |
| status                         | AVAILABLE, HELD, or SOLD              |
| hold_expires_at                | Expiry timestamp for a temporary hold |
| held_by_user_id (FK, nullable) | User who currently holds the seat     |

A unique constraint on `(event_id, seat_number)` ensures that the same physical seat is not entered twice for an event.

### Table 4: Orders

| Column          | Purpose                             |
| --------------- | ----------------------------------- |
| id (PK)         | Unique order identifier             |
| user_id (FK)    | References Users.id                 |
| status          | PENDING, PAID, FAILED, or EXPIRED   |
| total_amount    | Total order amount                  |
| idempotency_key | Unique key for safe request retries |
| created_at      | Order creation timestamp            |

A unique constraint on the idempotency key, scoped to the appropriate user or checkout operation, prevents duplicate order creation when a client retries a request.

### Table 5: Order_Items

This table connects orders to the individual seats being purchased.

| Column        | Purpose                            |
| ------------- | ---------------------------------- |
| id (PK)       | Unique order-item identifier       |
| order_id (FK) | References Orders.id               |
| seat_id (FK)  | References Seats.id                |
| price         | Price of the seat at purchase time |

A unique constraint on `seat_id` ensures that a seat can appear in only one final order item. The application must insert the final order item and update the seat to SOLD in the same database transaction.

### Table 6: Payments

| Column                      | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| id (PK)                     | Unique payment identifier                |
| order_id (FK)               | References Orders.id                     |
| provider_reference (UNIQUE) | Payment provider's transaction reference |
| status                      | PENDING, SUCCEEDED, or FAILED            |
| amount                      | Amount paid                              |
| created_at                  | Payment record timestamp                 |

The system stores payment references and statuses rather than raw card details.

### Relationships

- One user can create many orders.
- One event can have many seats.
- One order can contain many order items.
- Each order item references one seat.
- Each seat belongs to one event.
- An order can have payment attempts, tracked in the Payments table.

Foreign keys enforce these relationships. Database constraints protect important rules even when several application servers process requests simultaneously.

## 5. Preventing Double-Booking

The most important correctness requirement is that two customers must never purchase the same seat.

TicketHub uses database transactions, conditional updates, constraints, and temporary holds.

### Step 1: Hold a Seat Atomically

When a customer requests a seat, the server starts a database transaction and attempts a conditional update similar to:

UPDATE seats
SET status = 'HELD',
held_by_user_id = :user_id,
hold_expires_at = :expiry
WHERE id = :seat_id
AND status = 'AVAILABLE';

The server checks the number of affected rows.

- If one row was updated, the seat was successfully held.
- If zero rows were updated, the seat was no longer available, so the hold fails.

When two customers attempt to hold the same seat, the database coordinates the concurrent updates. Only one can successfully change the available seat to held.

For seats that have expired holds, the system must first safely reclaim the expired hold using a conditional update or transaction. It must not assume that a seat is available merely because a timestamp has passed.

### Step 2: Commit the Hold

The server commits the transaction only after the requested seats have been held successfully.

For multiple seats, all holds should succeed together or the transaction should roll back, avoiding partial reservations.

The hold has a short expiry time, for example five minutes. If checkout is not completed, a background worker can release expired holds, while new hold requests also check expiry conditions to avoid depending entirely on the worker.

### Step 3: Confirm Payment and Finalize the Order

When the customer pays, TicketHub verifies the payment result with the payment provider.

The server then starts a database transaction that:

1. Verifies that the order and hold are valid.
2. Confirms that the seats are still held for the correct customer and order.
3. Changes the seats from HELD to SOLD using conditional updates.
4. Records the order items and successful payment status.
5. Commits all database changes together.

If any required update fails, the database transaction is rolled back. The application must not issue tickets for a failed transaction.

Payment processing may take place outside the database transaction because external payment calls can be slow. Idempotency keys and payment-provider references help the system safely handle retries, delayed callbacks, and duplicate notifications. The system must reconcile uncertain payment outcomes rather than blindly retrying a charge or releasing seats while a payment is still unresolved.

**Why this works:** Atomic updates prevent competing customers from claiming the same available seat. Transactions keep related database changes consistent, and unique constraints provide an additional safeguard against duplicate sales.

## 6. Architecture

mermaid
flowchart TD
U[Customers and Browsers]
CDN[CDN and Static Cache]
W[Web Application]
Q[Waiting Room and Rate Limiter]
LB[Load Balancer]
API[Stateless API Servers]
CACHE[Redis Cache]
DB[(PostgreSQL Primary Database)]
PAY[External Payment Provider]
QUEUE[Background Job Queue]
WORKER[Workers for Expiry and Notifications]

    U --> CDN
    CDN --> W
    W --> Q
    Q --> LB
    LB --> API
    API --> CACHE
    API --> DB
    API --> PAY
    API --> QUEUE
    QUEUE --> WORKER
    WORKER --> DB

### Component Explanations

**Customers and browsers:** Customers browse events, view seat maps, hold seats, and purchase tickets.

**CDN and static cache:** Delivers static assets such as images, stylesheets, and JavaScript from locations closer to customers, reducing load on the application servers.

**Web application:** Provides the website interface and communicates with the backend API.

**Waiting room and rate limiter:** Controls how many customers enter the purchase flow at once. A queue can assign customers an orderly opportunity to proceed and limit automated abuse. The queue must not promise seats before the database confirms a hold.

**Load balancer:** Distributes requests across multiple API servers and avoids sending traffic to unhealthy servers.

**Stateless API servers:** Handle event browsing, authentication, seat holds, order creation, and ticket retrieval. Multiple instances can be added during a sale.

**Redis cache:** Stores frequently requested, relatively stable information such as event details. It reduces repeated database reads. Cached seat availability is only a display aid and is never the final authority for purchasing.

**PostgreSQL primary database:** Stores authoritative users, seats, orders, and payments. Transactions, conditional updates, foreign keys, and unique constraints enforce purchase correctness.

**External payment provider:** Processes payments and sends verified payment results back to TicketHub. Payment requests must use idempotency controls.

**Background job queue and workers:** Handle tasks such as releasing expired holds, sending confirmations, and processing notifications. These tasks can be retried safely without blocking every customer request.

### Surviving the Big Sale

During the popular sale, the CDN serves static content without repeatedly contacting the backend. Event details can be cached, while the waiting room limits the number of simultaneous checkout requests.

The load balancer distributes admitted traffic among horizontally scalable API servers. Redis reduces repeated reads, and PostgreSQL remains the final authority for seat ownership and availability.

The system should monitor database connections, transaction latency, failed hold attempts, queue length, payment delays, and error rates. It should apply backpressure rather than admitting more checkout traffic than the database can safely process.

Read replicas can help with suitable read-only queries, but seat-hold and purchase decisions must use an authoritative transactional database path. The design also needs tested database backups, recovery procedures, and payment reconciliation.

## 7. Trade-Offs

### Trade-Off 1: Strong Consistency vs. Maximum Throughput

Using PostgreSQL transactions and conditional updates protects against double-booking. However, locking and coordinating updates can reduce throughput when many customers try to reserve the same seats simultaneously.

**Decision:** Prioritize correct seat ownership over allowing every purchase attempt to succeed immediately. Use caching and a waiting room to reduce unnecessary database load.

### Trade-Off 2: Fairness vs. Speed

A waiting room can provide an orderly purchase process and reduce overload, but customers may have to wait longer before entering checkout.

**Decision:** Use a transparent queue with clear status updates and reasonable rate limits. The queue should be designed to reduce abuse without treating cached seat availability as a reservation.

### Trade-Off 3: Cache Performance vs. Freshness

Caching event details and seat availability improves response times, but cached seat information can become outdated.

**Decision:** Cache stable event information aggressively, but recheck and reserve seats through the authoritative database. Show clear messages when a seat becomes unavailable.

### Trade-Off 4: Immediate Payment vs. Reliable Checkout

Holding seats while waiting for an external payment provider improves the customer's chance of completing checkout, but long payment delays can temporarily block inventory.

**Decision:** Use short, clearly communicated holds and idempotent payment processing. Handle delayed or uncertain payment results through reconciliation rather than making unsafe assumptions about whether a payment succeeded.

## 8. Conclusion

TicketHub combines scalable web infrastructure with a transactional relational database. Caching, a waiting room, load balancing, and background workers help the platform handle sudden demand. Conditional seat updates, database transactions, unique constraints, and safe payment handling prevent duplicate sales and protect customers during popular concert releases.
