-- 001_initial.sql
-- Initial schema for Dispatch Prime Green
-- All operational tables enforce terminal scoping via terminal_id FK

BEGIN;

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Helper: auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- terminals
-- ============================================================

CREATE TABLE terminals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  agent         text,
  dcp           text,
  city          text,
  state         text,
  street_address  text,
  street_address2 text,
  zip           text,
  country       text,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  timezone      text NOT NULL DEFAULT 'America/Chicago',
  geotab_group_id text,
  terminal_type text NOT NULL DEFAULT 'terminal'
    CHECK (terminal_type IN ('terminal', 'hub')),
  worklist      text,
  leaders       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE TRIGGER terminals_updated_at
  BEFORE UPDATE ON terminals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- users
-- ============================================================

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL UNIQUE,
  password_hash       text NOT NULL,
  first_name          text,
  last_name           text,
  roles               text[] NOT NULL DEFAULT '{}',
  home_terminal_id    uuid REFERENCES terminals(id) ON DELETE SET NULL,
  favorite_terminal_ids uuid[] NOT NULL DEFAULT '{}',
  is_active           boolean NOT NULL DEFAULT true,
  last_logged_in      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_home_terminal ON users(home_terminal_id);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- drivers
-- ============================================================

CREATE TABLE drivers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  dob                     date,
  employee_number         text,
  geotab_username         text,
  license_number          text,
  license_state           text,
  license_type            text,
  license_exp_date        date,
  status                  text,
  worker_classification   text CHECK (worker_classification IN ('W2', 'Contract')),
  operating_authority     text,
  hire_date               date,
  termination_date        date,
  rehire_date             date,
  primary_phone           text,
  driving_experience      text,
  cdl_driving_experience  text,
  total_years_experience  text,
  worklist                text,
  created_at              timestamptz NOT NULL DEFAULT NOW(),
  updated_at              timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_employee_number ON drivers(employee_number);
CREATE INDEX idx_drivers_geotab_username ON drivers(geotab_username);

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- terminal_drivers (junction: terminal ↔ driver)
-- ============================================================

CREATE TABLE terminal_drivers (
  terminal_id   uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  driver_id     uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (terminal_id, driver_id)
);

CREATE INDEX idx_terminal_drivers_driver ON terminal_drivers(driver_id);

-- ============================================================
-- terminal_bench_drivers (bench drivers per terminal)
-- ============================================================

CREATE TABLE terminal_bench_drivers (
  terminal_id   uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  driver_id     uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (terminal_id, driver_id)
);

CREATE INDEX idx_terminal_bench_drivers_driver ON terminal_bench_drivers(driver_id);

-- ============================================================
-- vehicles
-- ============================================================

CREATE TABLE vehicles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id                  text NOT NULL,
  vin                       text,
  license_plate             text,
  license_state             text,
  odometer                  numeric,
  vehicle_type              text CHECK (vehicle_type IN ('ST', 'TT')),
  status                    text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance', 'out_of_service')),
  geotab_device_id          text,
  last_location_latitude    numeric(10,7),
  last_location_longitude   numeric(10,7),
  last_location_updated     timestamptz,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT NOW(),
  updated_at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_truck_id ON vehicles(truck_id);
CREATE INDEX idx_vehicles_geotab_device ON vehicles(geotab_device_id);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- terminal_vehicles (junction: terminal ↔ vehicle)
-- ============================================================

CREATE TABLE terminal_vehicles (
  terminal_id   uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  vehicle_id    uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (terminal_id, vehicle_id)
);

CREATE INDEX idx_terminal_vehicles_vehicle ON terminal_vehicles(vehicle_id);

-- ============================================================
-- equipment
-- ============================================================

CREATE TABLE equipment (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_number        text NOT NULL,
  equipment_type          text NOT NULL
    CHECK (equipment_type IN ('truck', 'trailer', 'sub_unit')),
  status                  text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  operational_status      text
    CHECK (operational_status IN ('dedicated', 'substitute', 'spare', 'out_of_service')),
  truck_type              text,
  make                    text,
  model                   text,
  year                    text,
  vin                     text,
  license_plate           text,
  registration_state      text,
  registration_expiry     date,
  insurance_policy        text,
  insurance_expiry        date,
  last_maintenance_date   date,
  next_maintenance_date   date,
  mileage                 numeric,
  fuel_type               text,
  capacity                text,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT NOW(),
  updated_at              timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipment_number ON equipment(equipment_number);

CREATE TRIGGER equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- customers
-- ============================================================

CREATE TABLE customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cid           text NOT NULL UNIQUE,
  name          text NOT NULL,
  address       text,
  city          text,
  state         text,
  zip_code      text,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  timezone      text,
  open_time     time,
  close_time    time,
  lanter_id     text,
  customer_pdc  text,
  geo_result    text,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_cid ON customers(cid);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- routes
-- ============================================================

CREATE TABLE routes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trkid               text NOT NULL UNIQUE,
  terminal_id         uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  leg_number          text,
  truck_number        text,
  sub_unit_number     text,
  default_driver_id   uuid REFERENCES drivers(id) ON DELETE SET NULL,
  fuel_card           text,
  scanner             text,
  departure_time      time,
  sun                 boolean NOT NULL DEFAULT false,
  mon                 boolean NOT NULL DEFAULT false,
  tue                 boolean NOT NULL DEFAULT false,
  wed                 boolean NOT NULL DEFAULT false,
  thu                 boolean NOT NULL DEFAULT false,
  fri                 boolean NOT NULL DEFAULT false,
  sat                 boolean NOT NULL DEFAULT false,
  total_stops         integer NOT NULL DEFAULT 0,
  estimated_duration  numeric,
  estimated_distance  numeric,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_terminal ON routes(terminal_id);
CREATE INDEX idx_routes_trkid ON routes(trkid);
CREATE INDEX idx_routes_default_driver ON routes(default_driver_id);

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- route_stops
-- ============================================================

CREATE TABLE route_stops (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES customers(id) ON DELETE SET NULL,
  sequence      integer NOT NULL,
  cid           text,
  cust_name     text,
  address       text,
  city          text,
  state         text,
  zip_code      text,
  latitude      numeric(10,7),
  longitude     numeric(10,7),
  eta           time,
  etd           time,
  commit_time   text,
  fixed_time    text,
  cube          text,
  timezone      text,
  open_time     time,
  close_time    time,
  lanter_id     text,
  customer_pdc  text,
  geo_result    text,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_customer ON route_stops(customer_id);
CREATE UNIQUE INDEX idx_route_stops_route_sequence ON route_stops(route_id, sequence);

CREATE TRIGGER route_stops_updated_at
  BEFORE UPDATE ON route_stops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- dispatch_events (merged DispatchedRoute + RouteExecution)
-- ============================================================

CREATE TABLE dispatch_events (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                  uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  terminal_id               uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  execution_date            date NOT NULL,
  assigned_driver_id        uuid REFERENCES drivers(id) ON DELETE SET NULL,
  assigned_truck_id         text,
  assigned_sub_unit_id      text,
  status                    text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'assigned', 'dispatched', 'in_transit', 'completed', 'cancelled', 'delayed')),
  priority                  text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'high', 'urgent')),

  -- Timing
  planned_departure_time    time,
  actual_departure_time     timestamptz,
  estimated_return_time     time,
  actual_return_time        timestamptz,
  estimated_completion_time timestamptz,
  actual_completion_time    timestamptz,

  -- Delays and cancellation
  estimated_delay_minutes   integer,
  cancellation_reason       text,
  cancellation_notes        text,

  -- Notes
  dispatch_notes            text,
  operational_notes         text,

  -- Performance metrics
  total_miles               numeric,
  total_service_time        numeric,
  fuel_used                 numeric,
  on_time_performance       numeric,

  -- Geotab tracking
  last_location_update      timestamptz,
  last_geotab_sync          timestamptz,

  created_at                timestamptz NOT NULL DEFAULT NOW(),
  updated_at                timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispatch_events_terminal ON dispatch_events(terminal_id);
CREATE INDEX idx_dispatch_events_route ON dispatch_events(route_id);
CREATE INDEX idx_dispatch_events_date ON dispatch_events(execution_date);
CREATE INDEX idx_dispatch_events_driver ON dispatch_events(assigned_driver_id);
CREATE INDEX idx_dispatch_events_status ON dispatch_events(status);
CREATE UNIQUE INDEX idx_dispatch_events_route_date ON dispatch_events(route_id, execution_date);

CREATE TRIGGER dispatch_events_updated_at
  BEFORE UPDATE ON dispatch_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- dispatch_event_stops
-- ============================================================

CREATE TABLE dispatch_event_stops (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_event_id     uuid NOT NULL REFERENCES dispatch_events(id) ON DELETE CASCADE,
  route_stop_id         uuid REFERENCES route_stops(id) ON DELETE SET NULL,
  sequence              integer NOT NULL,
  planned_eta           time,
  planned_etd           time,
  actual_arrival_time   timestamptz,
  actual_departure_time timestamptz,
  service_time          numeric,
  status                text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'arrived', 'completed', 'skipped', 'exception')),
  on_time_status        text
    CHECK (on_time_status IN ('early', 'on_time', 'delayed', 'late')),
  latitude              numeric(10,7),
  longitude             numeric(10,7),
  odometer              numeric,
  fuel_used             numeric,
  notes                 text,
  exception_reason      text,
  skip_reason           text,
  requires_attention    boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispatch_event_stops_event ON dispatch_event_stops(dispatch_event_id);
CREATE INDEX idx_dispatch_event_stops_route_stop ON dispatch_event_stops(route_stop_id);
CREATE UNIQUE INDEX idx_dispatch_event_stops_event_sequence
  ON dispatch_event_stops(dispatch_event_id, sequence);

CREATE TRIGGER dispatch_event_stops_updated_at
  BEFORE UPDATE ON dispatch_event_stops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- route_substitutions
-- ============================================================

CREATE TABLE route_substitutions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                  uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  start_date                date NOT NULL,
  end_date                  date NOT NULL,
  driver_id                 uuid REFERENCES drivers(id) ON DELETE SET NULL,
  truck_number              text,
  sub_unit_number           text,
  scanner                   text,
  fuel_card                 text,
  route_stops_modifications jsonb,
  reason                    text,
  created_by                uuid REFERENCES users(id) ON DELETE SET NULL,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT NOW(),
  updated_at                timestamptz NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_route_substitutions_route ON route_substitutions(route_id);
CREATE INDEX idx_route_substitutions_dates ON route_substitutions(start_date, end_date);

CREATE TRIGGER route_substitutions_updated_at
  BEFORE UPDATE ON route_substitutions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- availability
-- ============================================================

CREATE TABLE availability (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  start_date          date NOT NULL,
  end_date            date NOT NULL,
  availability_type   text NOT NULL
    CHECK (availability_type IN ('available', 'not_available', 'pto', 'vacation', 'sick', 'personal')),
  reason              text,
  notes               text,
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_availability_driver ON availability(driver_id);
CREATE INDEX idx_availability_dates ON availability(start_date, end_date);

CREATE TRIGGER availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- alerts
-- ============================================================

CREATE TABLE alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id         uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  alert_type          text NOT NULL
    CHECK (alert_type IN ('hos_violation', 'appointment_deviation', 'schedule_issue', 'route_deviation', 'unassigned_route', 'driver_unavailable')),
  severity            text NOT NULL
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title               text NOT NULL,
  message             text,
  metadata            jsonb,
  entity_type         text,
  entity_id           uuid,
  is_acknowledged     boolean NOT NULL DEFAULT false,
  acknowledged_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at     timestamptz,
  is_resolved         boolean NOT NULL DEFAULT false,
  resolved_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at         timestamptz,
  resolution_notes    text,
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_terminal ON alerts(terminal_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_unresolved ON alerts(terminal_id) WHERE is_resolved = false;

CREATE TRIGGER alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- holiday_calendar
-- ============================================================

CREATE TABLE holiday_calendar (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id   uuid NOT NULL REFERENCES terminals(id) ON DELETE CASCADE,
  date          date NOT NULL,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (terminal_id, date)
);

CREATE INDEX idx_holiday_calendar_terminal ON holiday_calendar(terminal_id);

CREATE TRIGGER holiday_calendar_updated_at
  BEFORE UPDATE ON holiday_calendar
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- audit_logs (append-only, no updated_at)
-- ============================================================

CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL
    CHECK (event_type IN ('login', 'logout', 'failed_login', 'profile_update', 'password_change', 'availability_change', 'customer_contact', 'route_change', 'truck_maintenance', 'driver_contact', 'dispatch_change', 'alert_acknowledged', 'alert_resolved', 'system_change')),
  entity_type   text NOT NULL
    CHECK (entity_type IN ('user', 'driver', 'customer', 'route', 'vehicle', 'equipment', 'terminal', 'dispatch_event', 'alert', 'system')),
  entity_id     uuid,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email    text,
  summary       text NOT NULL,
  metadata      jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- geotab_sessions
-- ============================================================

CREATE TABLE geotab_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  database              text NOT NULL,
  username              text NOT NULL,
  encrypted_password    text NOT NULL,
  session_id            text,
  server                text,
  is_authenticated      boolean NOT NULL DEFAULT false,
  last_authenticated    timestamptz,
  auth_expiry           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geotab_sessions_user ON geotab_sessions(user_id);

CREATE TRIGGER geotab_sessions_updated_at
  BEFORE UPDATE ON geotab_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
