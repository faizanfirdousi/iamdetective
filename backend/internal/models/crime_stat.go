package models

// CrimeStat represents aggregate FBI crime data for contextual dashboard use.
type CrimeStat struct {
	ID                int    `json:"id" db:"id"`
	StateAbbr         string `json:"state_abbr" db:"state_abbr"`
	Year              int    `json:"year" db:"year"`
	ViolentCrime      int    `json:"violent_crime" db:"violent_crime"`
	Homicide          int    `json:"homicide" db:"homicide"`
	Robbery           int    `json:"robbery" db:"robbery"`
	AggravatedAssault int    `json:"aggravated_assault" db:"aggravated_assault"`
	PropertyCrime     int    `json:"property_crime" db:"property_crime"`
	Burglary          int    `json:"burglary" db:"burglary"`
	LarcenyTheft      int    `json:"larceny_theft" db:"larceny_theft"`
	MotorVehicleTheft int    `json:"motor_vehicle_theft" db:"motor_vehicle_theft"`
	Population        int    `json:"population" db:"population"`
}
