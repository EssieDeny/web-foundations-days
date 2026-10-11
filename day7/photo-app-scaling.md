# Day 7 Assignment: Scaling a Photo-Sharing App

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view feeds containing photos from people they follow.

The following assumptions are used:

- Registered users: 10,000,000.
- Daily active users: 10% of registered users.
- Each active user uploads one photo per day.
- Each active user views 50 feed pages per day.
- Each original photo is 2 MB.
- Each photo has one thumbnail of 50 KB.
- One day has 86,400 seconds, and one year has 365 days.
- Uploaded photos and thumbnails are retained for at least one year.
- Storage uses decimal units: 1 TB = 1,000,000 MB.
- Peak feed traffic is estimated at five times the average traffic.
- Feed request estimates count page requests, not the additional requests for images and other assets.

## 2. Capacity Calculations

### Daily Active Users

Daily active users (DAU) = Registered users × Daily active percentage.

10,000,000 × 10% = **1,000,000 daily active users**.

### Photo Uploads per Second

Daily uploads = 1,000,000 users × 1 photo = 1,000,000 uploads per day.

Average uploads per second = 1,000,000 ÷ 86,400 = approximately **11.57 uploads per second**.

### Feed Requests per Second

Daily feed requests = 1,000,000 users × 50 pages = 50,000,000 feed requests per day.

Average feed requests per second = 50,000,000 ÷ 86,400 = approximately **579 feed requests per second**.

Peak feed requests per second = 579 × 5 = approximately **2,895 feed requests per second**.

The system should therefore be designed to handle about 579 feed requests per second on average and approximately 2,895 during estimated peak traffic.

These figures represent feed page requests only. Additional traffic will come from API calls, image delivery, authentication, and other application activities.

### Photo Storage per Year

Each upload produces an original photo and a thumbnail.

- Original photo = 2 MB.
- Thumbnail = 50 KB = 0.05 MB.
- Total storage per upload = 2.05 MB.
- Daily storage growth = 1,000,000 × 2.05 MB = 2,050,000 MB = 2.05 TB.
- Annual storage growth = 2.05 TB × 365 = **748.25 TB per year**.

This estimate includes original photos and thumbnails but excludes backups, replication, metadata, and other storage overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 million feed pages per day but upload only one million photos per day.

Feed page requests occur 50 times as often as photo uploads. The architecture should therefore prioritize fast reads through caching, database read replicas, and content delivery network (CDN) image delivery while maintaining reliable upload processing.

## 4. Why Photos Should Not Be Stored in the Database

Photos are large binary files that would consume substantial database storage and make backups, replication, and queries more expensive.

Instead, original photos and thumbnails should be stored in object storage. The database should store metadata such as photo IDs, user IDs, captions, timestamps, processing status, and object-storage keys.

This separation allows image files and database records to scale independently. It also allows the CDN to deliver frequently accessed images efficiently without requiring every image request to pass through the application servers.

## 5. Architecture Diagram

```text
                           Users
                             |
                  +----------+----------+
                  |                     |
                  v                     v
          +---------------+     +---------------+
          | CDN           |     | API Requests  |
          | Image Delivery|     +---------------+
          +---------------+             |
                  |                     v
                  |             +---------------+
                  |             | Load Balancer |
                  |             +---------------+
                  |                     |
                  |          +----------+----------+
                  |          |          |          |
                  |          v          v          v
                  |      +--------+ +--------+ +--------+
                  |      | App    | | App    | | App    |
                  |      | Server | | Server | | Server |
                  |      +--------+ +--------+ +--------+
                  |          |          |
                  |          +-----+----+
                  |                |
                  |       +--------+---------+
                  |       |                  |
                  |       v                  v
                  |  +----------+     +-------------+
                  |  | Redis    |     | Primary DB  |
                  |  | Cache    |     +-------------+
                  |  +----------+            |
                  |                          v
                  |                   +--------------+
                  |                   | Read Replica |
                  |                   +--------------+
                  |
                  v
          +------------------+
          | Object Storage   |
          | Image Origin     |
          +------------------+

          PHOTO UPLOAD AND THUMBNAIL PIPELINE

                     App Server
                          |
                          v
                  +------------------+
                  | Object Storage   |
                  | Original Photo   |
                  +------------------+
                          |
                          v
                  +------------------+
                  | Job Queue        |
                  +------------------+
                          |
                          v
                  +------------------+
                  | Thumbnail Worker |
                  +------------------+
                          |
                          v
                  +------------------+
                  | Object Storage   |
                  | Thumbnail        |
                  +------------------+

          The CDN retrieves image files from object storage
          when they are not already cached.

          Application servers handle API requests and
          coordinate access to the cache, database,
          object storage, and job queue.

          Application servers write to the primary database
          and use the read replica for suitable read queries.
```

## 6. Architecture Components and Their Purposes

- **CDN (Content Delivery Network):** Delivers cached photos and thumbnails from locations closer to users, reducing latency and traffic to the origin.
- **Load balancer:** Distributes incoming API requests across healthy application servers to prevent individual servers from becoming overloaded.
- **Application servers:** Handle authentication, upload validation, feed generation, and communication between the database, cache, object storage, and job queue.
- **Redis cache:** Stores frequently requested feed data and metadata to reduce repeated database queries and improve response times.
- **Primary database:** Stores authoritative user records, follow relationships, captions, photo metadata, processing status, and object-storage keys.
- **Database read replica:** Handles suitable read queries to reduce the read workload on the primary database, although replication lag can temporarily produce stale results.
- **Object storage:** Stores original photos and thumbnails as files, avoiding the cost and complexity of storing large images directly in database rows.
- **Job queue:** Holds thumbnail-generation tasks so image processing can happen asynchronously instead of blocking the upload request.
- **Thumbnail worker:** Retrieves queued jobs, resizes original photos, and saves generated thumbnails to object storage.

## 7. Step-by-Step Photo Upload Flow

1. A user selects a photo and submits it to SnapShare.
2. An application server authenticates the user and validates the file type and size.
3. The server uploads the original photo to object storage and obtains its storage key.
4. The server saves the photo metadata and storage key in the primary database.
5. The server places a thumbnail-generation job on the queue.
6. Once the original photo, metadata, and queue job have been successfully saved, the application acknowledges the upload to the user without waiting for thumbnail generation to finish.
7. A background thumbnail worker retrieves the job from the queue.
8. The worker reads the original photo from object storage and resizes it to create a smaller thumbnail of approximately 50 KB.
9. The worker saves the thumbnail in object storage and updates the photo's processing status or thumbnail key in the database.
10. When followers open their feeds, application servers retrieve feed data from the cache or an appropriate database source and return references to the photos.
11. The CDN serves available originals and thumbnails, reducing the load on object storage and improving image delivery speed.

If thumbnail generation fails, the queue should support retries and monitoring. Repeatedly failing jobs should be sent to a dead-letter queue for investigation. The application can display a placeholder or the original image while the thumbnail is pending.

## 8. Architectural Trade-Offs

### Trade-Off 1: Caching versus Data Freshness

Caching feed data reduces database load and improves response times. However, users might temporarily see outdated feeds after new photos are uploaded or follow relationships change. Cache invalidation and expiration policies improve freshness but add complexity and can increase database traffic.

### Trade-Off 2: Read Replicas versus Consistency

Read replicas increase read capacity and help serve millions of feed requests. However, replication lag can cause a newly uploaded photo to be missing temporarily from a feed. Critical reads can use the primary database, while ordinary feed reads can use the replica when slight delays are acceptable.

### Trade-Off 3: Asynchronous Processing versus Immediate Thumbnail Availability

Generating thumbnails in the background makes uploads faster and prevents image processing from blocking application servers. However, thumbnails are not immediately available, and the queue and workers require monitoring, retries, and failure handling.

### Trade-Off 4: CDN Performance versus Caching Costs and Freshness

A CDN reduces image-delivery latency and origin traffic. However, cached images may become stale if files change, and CDN requests and data transfer can add costs. Appropriate cache-control settings and invalidation policies are therefore necessary.

## 9. Conclusion

SnapShare should use horizontally scalable application servers, a load balancer, a CDN, Redis caching, a primary database with a read replica, object storage, and an asynchronous thumbnail-processing pipeline.

The capacity estimates are one million daily active users, approximately 12 uploads per second, 579 average feed requests per second, 2,895 estimated peak feed requests per second, and 748.25 TB of additional photo and thumbnail storage per year.

This architecture prioritizes read performance while separating large image files from structured database records and processing thumbnails asynchronously.
