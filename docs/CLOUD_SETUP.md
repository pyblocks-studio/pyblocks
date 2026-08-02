# PyBlocks Cloud setup

PyBlocks Cloud uses Supabase Auth and a row-level-secured project table. Passwords are processed by
Supabase Auth and are never stored in PyBlocks project data. Projects are compressed with browser-native
gzip before upload; browsers without `CompressionStream` use an uncompressed Base64 fallback.

## One-time setup

1. Create a Supabase project at <https://supabase.com/>.
2. Open **SQL Editor** and run `supabase/migrations/001_cloud_projects.sql`.
3. In **Authentication → Providers → Email**, choose whether new users must confirm their email. Keeping
   confirmation enabled is recommended for a public deployment.
4. In **Project Settings → API**, copy the project URL and the public publishable/anonymous key.
5. Put those two public values in `js/cloud-config.js`.
6. In **Authentication → URL Configuration**, add the production PyBlocks URL and local development URLs
   such as `http://localhost:8080` to the allowed redirect URLs.

Never place the Supabase service-role or secret key in this repository. The public key is safe to expose
only because the migration enables row-level security and grants project access exclusively to the signed-in
owner.

## Storage model

Each cloud record contains the versioned `.pyblocks` JSON payload, encoded as `gzip-base64` where supported.
The unique `(user_id, name)` constraint makes saving a project with the same name update that user's existing
copy. Local `.pyblocks` project saving and `.py` export remain available without an account.
