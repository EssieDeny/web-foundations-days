# SnapShare Photo App Scaling Plan

## 1. Assumptions

This plan estimates the infrastructure needed to support SnapShare, a photo-sharing application where users upload photos and view a feed of photos from people they follow.

The following assumptions are used:

- SnapShare has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo is 2 MB.
- Each photo has one thumbnail of 50 KB.
- A day has 86,400 seconds, and a year has 365 days.
- All uploaded photos and thumbnails are retained for at least one year.
- Storage estimates use decimal units: 1 TB = 1,000,000 MB.
- Traffic is distributed across the day for average-rate calculations. Peak feed traffic is estimated at five times the average.
- Each feed page view is counted as one feed request. Additional requests for images and other assets are not included in this request-rate calculation.

## 2. Traffic and Storage Estimates

### Daily active users

Daily active users (DAU) are estimated as:

10,000,000 registered users × 10% = 1,000,000 daily active users.

### Photo uploads

Each active user uploads one photo per day.

- Uploads per day: 1,000,000 × 1 = 1,000,000.
- Average uploads per second: 1,000,000 ÷ 86,400 ≈ 11.57.

SnapShare therefore handles approximately 12 uploads per second on average.

### Feed views

Each active user views 50 feed pages per day.

- Feed views per day: 1,000,000 × 50 = 50,000,000.
- Average feed views per second: 50,000,000 ÷ 86,400 ≈ 579.
- Peak feed views per second: 579 × 5 ≈ 2,894.

The design should support approximately 579 feed requests per second on average and about 2,894 per second during estimated peak traffic.

### Photo storage per year

Each upload creates an original photo and one thumbnail.

- Original photo: 2 MB.
- Thumbnail: 50 KB ≈ 0.05 MB.
- Total per upload: 2 + 0.05 = 2.05 MB.
- Daily storage growth: 1,000,000 × 2.05 MB = 2,050,000 MB = 2.05 TB.
- Annual storage growth: 2.05 TB × 365 = 748.25 TB.

SnapShare needs approximately 748.25 TB of additional storage per year for original photos and thumbnails, excluding backups, replication, metadata, and storage overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a read-heavy system because users view 50 million feed pages per day but upload only one million photos per day.

Feed views occur approximately 50 times as often as photo uploads. The architecture should therefore prioritize fast feed delivery, caching, database read replicas, and CDN delivery while still handling reliable photo uploads.

## 4. Why Photos Should Not Be Stored Inside the Database

Photos are large binary files that would consume significant database storage and make backups, database replication, and queries more expensive. Instead, the original photos and thumbnails should be stored in object storage, while the database stores metadata such as photo IDs, user IDs, captions, timestamps, and object-storage keys or URLs.

This separation allows photo files to scale independently from the database and enables the CDN to deliver images efficiently.

## 5. Architecture Diagram

```text
                         Users
                           |
                           v
                     +-----------+
                     |    CDN    |
                     +-----------+
                           |
                           v
                  +------------------+
                  | Load Balancer    |
                  +------------------+
                           |
               +-----------+-----------+
               |           |           |
               v           v           v
          +---------+  +---------+  +---------+
          | App     |  | App     |  | App     |
          | Server  |  | Server  |  | Server  |
          +---------+  +---------+  +---------+
               |           |           |
               +-----------+-----------+
                           |
              +------------+------------+
              |                         |
              v                         v
        +-----------+             +-----------+
        | Cache     |             | Database  |
        | (Redis)   |             | Primary   |
        +-----------+             +-----------+
                                        |
                                        v
                                  +-----------+
                                  | Read      |
                                  | Replica   |
                                  +-----------+

Photo upload and thumbnail processing:

          App Server
               |
               v
       +-----------------+
       | Object Storage  |
       | Original Photos |
       +-----------------+
               |
               v
       +-----------------+
       | Job Queue       |
       +-----------------+
               |
               v
       +-----------------+
       | Thumbnail       |
       | Worker          |
       +-----------------+
               |
               v
       +-----------------+
       | Object Storage  |
       | Thumbnails      |
       +-----------------+

The CDN also delivers original photos and thumbnails from object storage.
The app servers use the primary database for writes and the read replica
for suitable read queries.
```

## 6. What Each Component Does

- **CDN:** Delivers cached images from locations closer to users, reducing latency and the load on origin infrastructure.
- **Load balancer:** Distributes incoming requests across healthy app servers to avoid overloading one server.
- **App servers:** Handle application logic, authenticate users, process uploads, and prepare personalized feeds.
- **Cache (Redis):** Stores frequently accessed feed data and metadata to reduce repeated database queries.
- **Primary database:** Stores authoritative records, including users, follows, captions, photo metadata, and object-storage keys.
- **Database read replica:** Serves suitable read queries to reduce read pressure on the primary database.
- **Object storage:** Stores original photos and generated thumbnails without placing large image files inside database rows.
- **Job queue:** Holds thumbnail-generation jobs so uploads do not have to wait for image processing to finish.
- **Thumbnail worker:** Processes queued jobs, creates smaller image versions, and saves the thumbnails to object storage.

## 7. Photo Upload Flow

1. A user selects a photo and submits it through the app.
2. The app server authenticates the user and validates the upload, including its file type and size.
3. The original photo is uploaded to object storage, which returns or identifies its storage key.
4. The app server saves the photo metadata and storage key in the primary database.
5. The app server places a thumbnail-generation job on the queue.
6. The server confirms the upload to the user once the original photo and required metadata have been saved and the thumbnail job has been accepted.
7. A background worker retrieves the job from the queue and downloads or reads the original photo from object storage.
8. The worker creates a thumbnail of approximately 50 KB and stores it in object storage.
9. The worker updates the photo metadata or processing status to indicate that the thumbnail is ready.
10. When followers request their feeds, app servers retrieve suitable feed data from the cache or database and return photo references. The CDN delivers the available image files.

If thumbnail processing fails, the job should be retried safely, with a dead-letter queue or monitoring process for jobs that repeatedly fail. The app should be able to show the original photo or a placeholder while the thumbnail is being generated.

## 8. Trade-Offs

### Trade-off 1: Caching versus data freshness

Caching feed data improves performance and reduces database load. However, users might temporarily see an outdated feed after a new photo is uploaded or a follow relationship changes. Cache invalidation or short expiration times can improve freshness but add complexity and may increase database traffic.

### Trade-off 2: Database read replicas versus consistency

Read replicas increase read capacity and help the system handle many feed requests. However, replication can lag behind the primary database, meaning a newly uploaded photo might not appear immediately in a feed read from the replica. Critical reads can use the primary database, while ordinary feed reads can tolerate a short delay.

### Trade-off 3: Asynchronous thumbnails versus immediate availability

Generating thumbnails in the background makes uploads faster and prevents image processing from blocking app servers. However, thumbnails may not be available immediately, and the queue and worker require monitoring, retries, and failure handling.

### Trade-off 4: CDN caching versus storage freshness and cost

A CDN reduces latency and origin traffic, especially for frequently viewed photos. However, cached content can become stale, and CDN requests and data transfer may add costs. Cache-control policies and invalidation are needed when images change.

## 9. Conclusion

SnapShare should use a horizontally scalable application tier, a CDN, Redis caching, a primary database with a read replica, object storage for images, and asynchronous thumbnail processing through a queue and worker.

The estimates of one million daily active users, approximately 579 average feed requests per second, approximately 2,894 peak feed requests per second, and 748.25 TB of annual photo and thumbnail storage provide a starting point for capacity planning. Actual infrastructure sizing should be adjusted using measured traffic, image sizes, cache hit rates, and growth patterns.
