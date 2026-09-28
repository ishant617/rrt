-- ==============================================================================
-- AGRI-PULSE AI: INITIAL DATABASE SCHEMA, RLS POLICIES & SEED DATA
-- Migration: 001_initial_schema.sql
-- Target: Supabase Cloud PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crop_growth_stage') THEN
    CREATE TYPE crop_growth_stage AS ENUM (
      'LAND_PREPARATION',
      'GERMINATION_EMERGENCE',
      'VEGETATIVE_TILLERING',
      'FLOWERING_HEADING',
      'FRUIT_SET_GRAIN_FILL',
      'RIPENING_MATURITY',
      'POST_HARVEST'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'soil_texture_type') THEN
    CREATE TYPE soil_texture_type AS ENUM (
      'SANDY',
      'LOAMY_SAND',
      'SANDY_LOAM',
      'LOAM',
      'SILT_LOAM',
      'CLAY_LOAM',
      'SILTY_CLAY_LOAM',
      'HEAVY_CLAY',
      'BLACK_COTTON',
      'RED_LATERITE'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'irrigation_system_type') THEN
    CREATE TYPE irrigation_system_type AS ENUM (
      'RAIN_FED',
      'SURFACE_FLOOD',
      'FURROW',
      'SPRINKLER',
      'DRIP_MICRO',
      'SUB_SURFACE'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level_type') THEN
    CREATE TYPE risk_level_type AS ENUM (
      'LOW',
      'MODERATE',
      'HIGH',
      'CRITICAL'
    );
  END IF;
END $$;

-- 3. TABLES DEFINITION

-- 3.1 Profiles Table (Mirrors and extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  preferred_language TEXT DEFAULT 'en',
  preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
  country TEXT NOT NULL DEFAULT 'United States',
  state_province TEXT NOT NULL DEFAULT 'California',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.2 Farms Table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_area NUMERIC(10, 2) NOT NULL,
  area_unit TEXT DEFAULT 'hectare' CHECK (area_unit IN ('hectare', 'acre')),
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  elevation_meters NUMERIC(6, 1),
  primary_water_source TEXT DEFAULT 'Borewell / Ground Aquifer',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.3 Plots Table (Field subdivisions within a farm)
CREATE TABLE IF NOT EXISTS public.plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area NUMERIC(10, 2) NOT NULL,
  soil_texture soil_texture_type NOT NULL DEFAULT 'LOAM',
  irrigation_system irrigation_system_type NOT NULL DEFAULT 'DRIP_MICRO',
  current_crop TEXT,
  crop_variety TEXT,
  sowing_date DATE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.4 Soil Test Records Table
CREATE TABLE IF NOT EXISTS public.soil_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ph NUMERIC(3, 1) NOT NULL CHECK (ph >= 3.0 AND ph <= 11.0),
  organic_carbon_pct NUMERIC(4, 2) CHECK (organic_carbon_pct >= 0 AND organic_carbon_pct <= 10.0),
  nitrogen_value NUMERIC(7, 2) NOT NULL, -- kg/ha or ppm
  phosphorus_value NUMERIC(7, 2) NOT NULL,
  potassium_value NUMERIC(7, 2) NOT NULL,
  ec_ds_m NUMERIC(5, 2), -- Electrical conductivity in dS/m
  lab_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.5 Crop Advisories Table
CREATE TABLE IF NOT EXISTS public.crop_advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  growth_stage crop_growth_stage NOT NULL,
  advisory_title TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  nutritional_assessment JSONB NOT NULL,
  fertilizer_schedule JSONB NOT NULL,
  irrigation_plan JSONB NOT NULL,
  climate_risk_alert JSONB NOT NULL,
  pest_watch JSONB NOT NULL,
  raw_ai_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.6 Pest & Disease Diagnostics Table
CREATE TABLE IF NOT EXISTS public.pest_disease_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  symptom_description TEXT,
  diagnosis_name TEXT NOT NULL,
  scientific_name TEXT,
  pathogen_type TEXT NOT NULL,
  confidence_score NUMERIC(4, 3) NOT NULL,
  severity risk_level_type NOT NULL,
  affected_parts TEXT[] NOT NULL,
  cultural_control JSONB NOT NULL,
  biological_control JSONB NOT NULL,
  chemical_control JSONB NOT NULL,
  preventive_measures JSONB NOT NULL,
  raw_ai_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.7 Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Agronomic Consultation',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.8 Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_plots_farm_id ON public.plots(farm_id);
CREATE INDEX IF NOT EXISTS idx_soil_tests_plot_id ON public.soil_tests(plot_id);
CREATE INDEX IF NOT EXISTS idx_crop_advisories_plot_id ON public.crop_advisories(plot_id);
CREATE INDEX IF NOT EXISTS idx_pest_diagnostics_user ON public.pest_disease_diagnostics(user_id);
CREATE INDEX IF NOT EXISTS idx_pest_diagnostics_plot ON public.pest_disease_diagnostics(plot_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);

-- 5. AUTOMATIC TIMESTAMP UPDATER FUNCTION & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_farms_updated_at ON public.farms;
CREATE TRIGGER set_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_plots_updated_at ON public.plots;
CREATE TRIGGER set_plots_updated_at
  BEFORE UPDATE ON public.plots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. NEW USER AUTO-PROFILE SYNC TRIGGER (FROM AUTH.USERS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, preferred_language, preferred_units, country, state_province)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'AgriPulse Farmer'),
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_units', 'metric'),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Global'),
    COALESCE(NEW.raw_user_meta_data->>'state_province', 'General')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. SUPABASE STORAGE BUCKET CREATION (CROP DIAGNOSTICS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crop-diagnostics',
  'crop-diagnostics',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pest_disease_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 8.1 Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 8.2 Farms Policies
DROP POLICY IF EXISTS "Users can manage own farms" ON public.farms;
CREATE POLICY "Users can manage own farms" ON public.farms
  FOR ALL USING (auth.uid() = user_id);

-- 8.3 Plots Policies (Through Farm ownership)
DROP POLICY IF EXISTS "Users can manage own plots" ON public.plots;
CREATE POLICY "Users can manage own plots" ON public.plots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE public.farms.id = public.plots.farm_id
      AND public.farms.user_id = auth.uid()
    )
  );

-- 8.4 Soil Tests Policies
DROP POLICY IF EXISTS "Users can manage own soil tests" ON public.soil_tests;
CREATE POLICY "Users can manage own soil tests" ON public.soil_tests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.plots
      JOIN public.farms ON public.farms.id = public.plots.farm_id
      WHERE public.plots.id = public.soil_tests.plot_id
      AND public.farms.user_id = auth.uid()
    )
  );

-- 8.5 Crop Advisories Policies
DROP POLICY IF EXISTS "Users can manage own crop advisories" ON public.crop_advisories;
CREATE POLICY "Users can manage own crop advisories" ON public.crop_advisories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.plots
      JOIN public.farms ON public.farms.id = public.plots.farm_id
      WHERE public.plots.id = public.crop_advisories.plot_id
      AND public.farms.user_id = auth.uid()
    )
  );

-- 8.6 Pest & Disease Diagnostics Policies
DROP POLICY IF EXISTS "Users can manage own diagnostics" ON public.pest_disease_diagnostics;
CREATE POLICY "Users can manage own diagnostics" ON public.pest_disease_diagnostics
  FOR ALL USING (auth.uid() = user_id);

-- 8.7 Chat Sessions Policies
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 8.8 Chat Messages Policies
DROP POLICY IF EXISTS "Users can manage own chat messages" ON public.chat_messages;
CREATE POLICY "Users can manage own chat messages" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE public.chat_sessions.id = public.chat_messages.session_id
      AND public.chat_sessions.user_id = auth.uid()
    )
  );

-- 8.9 Storage Object Policies (crop-diagnostics)
DROP POLICY IF EXISTS "Public can view diagnostic images" ON storage.objects;
CREATE POLICY "Public can view diagnostic images" ON storage.objects
  FOR SELECT USING (bucket_id = 'crop-diagnostics');

DROP POLICY IF EXISTS "Authenticated users can upload diagnostic images" ON storage.objects;
CREATE POLICY "Authenticated users can upload diagnostic images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'crop-diagnostics' AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can delete own diagnostic images" ON storage.objects;
CREATE POLICY "Users can delete own diagnostic images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'crop-diagnostics' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 9. SEED DATA (PRODUCTION-GRADE DEMO RECORDS)
-- Inserts a deterministic demo user profile, farm, plots, soil tests, and initial advisory
DO $$
DECLARE
  demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
  demo_farm_id UUID := '11111111-1111-1111-1111-111111111111';
  demo_plot_1_id UUID := '22222222-2222-2222-2222-222222222221';
  demo_plot_2_id UUID := '22222222-2222-2222-2222-222222222222';
  demo_soil_test_id UUID := '33333333-3333-3333-3333-333333333331';
  demo_advisory_id UUID := '44444444-4444-4444-4444-444444444441';
  demo_diagnostic_id UUID := '55555555-5555-5555-5555-555555555551';
  demo_session_id UUID := '66666666-6666-6666-6666-666666666661';
BEGIN
  -- Insert dummy auth.users record if not present (only in development environments where auth schema permits)
  BEGIN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
      demo_user_id,
      '00000000-0000-0000-0000-000000000000',
      'demo.farmer@agripulse.ai',
      crypt('AgriPulseDemo2026!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Dr. Maya Henderson","preferred_language":"en","preferred_units":"metric","country":"United States","state_province":"California"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- In cloud environments where auth.users direct insert is restricted, continue to profile upsert
    NULL;
  END;

  -- 9.1 Demo Profile
  INSERT INTO public.profiles (id, full_name, phone_number, preferred_language, preferred_units, country, state_province)
  VALUES (
    demo_user_id,
    'Dr. Maya Henderson',
    '+1 (555) 234-8901',
    'en',
    'metric',
    'United States',
    'California'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;

  -- 9.2 Demo Farm
  INSERT INTO public.farms (id, user_id, name, total_area, area_unit, latitude, longitude, elevation_meters, primary_water_source)
  VALUES (
    demo_farm_id,
    demo_user_id,
    'Verdant Ridge Precision Farm',
    45.50,
    'hectare',
    36.7782590,
    -119.4179310,
    115.0,
    'Canal & Solar Drip Wells'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 9.3 Demo Plots
  INSERT INTO public.plots (id, farm_id, name, area, soil_texture, irrigation_system, current_crop, crop_variety, sowing_date)
  VALUES 
  (
    demo_plot_1_id,
    demo_farm_id,
    'North Terrace - Hard Red Winter Wheat',
    22.00,
    'LOAM',
    'SPRINKLER',
    'Wheat',
    'WB9229 Hard Red',
    CURRENT_DATE - INTERVAL '45 days'
  ),
  (
    demo_plot_2_id,
    demo_farm_id,
    'South Basin - Processing Tomatoes',
    18.50,
    'CLAY_LOAM',
    'DRIP_MICRO',
    'Tomato',
    'Heinz 9997 Hybrid',
    CURRENT_DATE - INTERVAL '20 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 9.4 Demo Soil Test
  INSERT INTO public.soil_tests (id, plot_id, test_date, ph, organic_carbon_pct, nitrogen_value, phosphorus_value, potassium_value, ec_ds_m, lab_name, notes)
  VALUES (
    demo_soil_test_id,
    demo_plot_1_id,
    CURRENT_DATE - INTERVAL '15 days',
    6.8,
    1.45,
    180.50,
    28.40,
    215.00,
    0.85,
    'CalAgri Central Valley Soil Lab',
    'Optimal baseline fertility; minor nitrogen depletion observed post-tillering.'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 9.5 Demo Crop Advisory
  INSERT INTO public.crop_advisories (
    id, plot_id, crop_name, growth_stage, advisory_title, executive_summary,
    nutritional_assessment, fertilizer_schedule, irrigation_plan, climate_risk_alert, pest_watch, raw_ai_payload
  )
  VALUES (
    demo_advisory_id,
    demo_plot_1_id,
    'Wheat',
    'VEGETATIVE_TILLERING',
    'Mid-Tillering Nutrition & Weather-Aligned Irrigation Schedule',
    'Your Hard Red Winter Wheat is currently entering peak vegetative tillering. Soil pH is at an optimal 6.8 with adequate potassium reserves. However, active tillering has drawn down available soil nitrogen. A split top-dressing of nitrogen is required before stem elongation, coordinated with the 12mm rainfall expected on Day 4.',
    '{
      "nitrogenStatus": "DEFICIENT",
      "phosphorusStatus": "OPTIMAL",
      "potassiumStatus": "OPTIMAL",
      "phEvaluation": "Optimal pH of 6.8 provides maximum micronutrient bio-availability.",
      "secondaryMicronutrientNotes": "Zinc and Sulfur levels are stable; monitor flag leaf color in 14 days."
    }'::jsonb,
    '[
      {
        "timingStage": "Immediate (Tillering Stage)",
        "fertilizerName": "Urea (46% N)",
        "quantityPerHectare": "65 kg/ha",
        "applicationMethod": "BROADCAST",
        "specificInstructions": "Broadcast 24 hours prior to forecasted rainfall to facilitate immediate root zone incorporation and prevent ammonia volatilization."
      },
      {
        "timingStage": "Jointing / Stem Elongation (18 days)",
        "fertilizerName": "Ammonium Sulfate (21% N, 24% S)",
        "quantityPerHectare": "40 kg/ha",
        "applicationMethod": "BAND_PLACEMENT",
        "specificInstructions": "Supply sulfur to bolster grain protein synthesis and gluten strength."
      }
    ]'::jsonb,
    '{
      "waterRequirementLevel": "MODERATE",
      "frequencyDays": 4,
      "waterVolumePerEvent": "28 mm via overhead center pivot",
      "weatherAdjustments": "Hold irrigation on Day 4 due to forecasted 12 mm rain event; resume on Day 7 if topsoil dries below 60% field capacity."
    }'::jsonb,
    '{
      "overallRiskLevel": "MODERATE",
      "primaryThreats": ["Upcoming heavy wind gusts (>22 km/h)", "Post-rain fungal spore germination window"],
      "actionableMitigationSteps": [
        "Avoid any foliar application during wind speeds exceeding 15 km/h to prevent chemical drift.",
        "Scout lower canopy for Yellow Rust (Puccinia striiformis) 48 hours following precipitation."
      ]
    }'::jsonb,
    '[
      {
        "threatName": "Stripe / Yellow Rust (Puccinia striiformis)",
        "riskProbability": "MEDIUM",
        "earlyWarningSigns": "Yellow-orange pustules arranged in linear stripes on upper leaf surfaces.",
        "preventiveAction": "Keep Propiconazole 25% EC in inventory; initiate prophylactic scout post-rain."
      },
      {
        "threatName": "Russian Wheat Aphid (Diuraphis noxia)",
        "riskProbability": "LOW",
        "earlyWarningSigns": "Longitudinal white, yellow, or purple streaking on tillers.",
        "preventiveAction": "Encourage native ladybird beetle predators; do not spray broad-spectrum insecticides prematurely."
      }
    ]'::jsonb,
    '{"model": "gemini-2.5-pro", "version": "v1.2", "generatedAt": "2026-09-28T04:00:00Z"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 9.6 Demo Diagnostic Record
  INSERT INTO public.pest_disease_diagnostics (
    id, user_id, plot_id, crop_name, image_url, symptom_description,
    diagnosis_name, scientific_name, pathogen_type, confidence_score, severity,
    affected_parts, cultural_control, biological_control, chemical_control,
    preventive_measures, raw_ai_payload
  )
  VALUES (
    demo_diagnostic_id,
    demo_user_id,
    demo_plot_2_id,
    'Tomato',
    'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=800&q=80',
    'Dark brown concentric rings forming on lower leaves with yellow halo surrounding the lesion spots.',
    'Early Blight of Tomato',
    'Alternaria solani',
    'FUNGAL',
    0.962,
    'MODERATE',
    ARRAY['Leaf', 'Stem Base'],
    '["Prune lower infected leaves up to 30 cm from ground level and destroy off-site.", "Stake plants and maintain drip irrigation to keep foliage completely dry."]'::jsonb,
    '["Foliar application of Bacillus subtilis strain QST 713 at 2.5 g/L weekly.", "Soil drenching with Trichoderma harzianum at transplant root zone."]'::jsonb,
    '[
      {
        "activeIngredient": "Azoxystrobin 18.2% + Difenoconazole 11.4% SC",
        "commercialTradeExamples": "Amistar Top, Quadris Top",
        "recommendedDosagePerLiter": "1.0 mL per Liter of water",
        "preHarvestIntervalDays": 3,
        "safetyPrecautions": "Wear nitrile chemical gloves and protective face shield. Do not spray within 50 meters of open aquatic bodies."
      },
      {
        "activeIngredient": "Copper Oxychloride 50% WP",
        "commercialTradeExamples": "Blitox 50, Cuprofix",
        "recommendedDosagePerLiter": "2.5 g per Liter of water",
        "preHarvestIntervalDays": 1,
        "safetyPrecautions": "Apply in early morning before ambient temperatures exceed 28°C to prevent foliar phytotoxicity."
      }
    ]'::jsonb,
    '["Execute 3-year crop rotation with non-solanaceous crops (maize, pulses).", "Use certified disease-free hybrid seeds with resistance markers."]'::jsonb,
    '{"analyzedBy": "gemini-2.5-flash", "timestamp": "2026-09-28T04:15:00Z"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 9.7 Demo Chat Session & Message
  INSERT INTO public.chat_sessions (id, user_id, plot_id, title)
  VALUES (
    demo_session_id,
    demo_user_id,
    demo_plot_1_id,
    'Tillering Nitrogen Split Consultation'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.chat_messages (id, session_id, sender_role, content, context_metadata)
  VALUES 
  (
    gen_random_uuid(),
    demo_session_id,
    'user',
    'I noticed the rain forecast was updated to 15mm on Thursday. Should I still apply the 65 kg/ha of Urea on Wednesday afternoon?',
    '{"plotId": "22222222-2222-2222-2222-222222222221", "crop": "Wheat"}'::jsonb
  ),
  (
    gen_random_uuid(),
    demo_session_id,
    'assistant',
    'Yes, Wednesday afternoon (approx. 18-24 hours prior to rainfall) is an optimal window for your Urea top-dressing. 

Here is why:
1. **Volatilization Reduction**: Urea needs moisture to dissolve and convert into ammonium carbonate. A gentle 15mm rain will wash the granules 3 to 5 cm into your loam soil, eliminating gaseous ammonia losses.
2. **Precaution**: Verify that the rain is not an intense cloudburst (>35mm/hr), which could cause surface runoff. If light to moderate showers (10-15mm) are confirmed, proceed with the 65 kg/ha broadcast Wednesday afternoon.',
    '{"confidence": 0.98, "recommendationType": "NUTRIENT_TIMING"}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

END $$;
