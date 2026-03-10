CREATE TABLE IF NOT EXISTS crime_stats (
    id SERIAL PRIMARY KEY, -- Using standard serial for numerical ID as defined in CrimeStat model
    state_abbr VARCHAR(10) NOT NULL,
    year INT NOT NULL,
    violent_crime INT,
    homicide INT,
    robbery INT,
    aggravated_assault INT,
    property_crime INT,
    burglary INT,
    larceny_theft INT,
    motor_vehicle_theft INT,
    population INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique index to prevent duplicate stats per state/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_crime_stats_state_year ON crime_stats(state_abbr, year);
