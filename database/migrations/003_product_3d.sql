-- Model assets are private until approved; no public default models.
-- Original uploaded binaries live in MODEL_STORAGE_DIR, never in the database or Git.
CREATE TABLE IF NOT EXISTS product_3d_models (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK (version >= 1),
 status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','processing','needs_review','approved','failed')),
 glb_file text,
 usdz_file text,
 glb_sha256 char(64),
 usdz_sha256 char(64),
 measured_width_mm integer CHECK (measured_width_mm > 0),
 measured_depth_mm integer CHECK (measured_depth_mm > 0),
 measured_height_mm integer CHECK (measured_height_mm > 0),
 rights_confirmed boolean NOT NULL DEFAULT false,
 geometry_verified boolean NOT NULL DEFAULT false,
 enabled_3d boolean NOT NULL DEFAULT false,
 enabled_ar boolean NOT NULL DEFAULT false,
 source_photo_notes text,
 reviewer_notes text,
 failure_reason text,
 created_by uuid REFERENCES admin_users(id),
 reviewed_by uuid REFERENCES admin_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT model_unique_version UNIQUE(product_id,version),
 CONSTRAINT approved_has_glb CHECK (
    status <> 'approved' OR
    (glb_file IS NOT NULL AND rights_confirmed AND geometry_verified)
 ),
 CONSTRAINT publish_requires_approval CHECK (
    (NOT enabled_3d AND NOT enabled_ar) OR
    (status = 'approved' AND glb_file IS NOT NULL AND rights_confirmed AND geometry_verified)
 ),
 CONSTRAINT ar_requires_both_files CHECK (
    NOT enabled_ar OR (enabled_3d AND usdz_file IS NOT NULL)
 )
);
CREATE INDEX IF NOT EXISTS product_models_public
 ON product_3d_models(product_id,version DESC)
 WHERE status='approved' AND enabled_3d;
CREATE INDEX IF NOT EXISTS product_models_review
 ON product_3d_models(status,created_at DESC);
