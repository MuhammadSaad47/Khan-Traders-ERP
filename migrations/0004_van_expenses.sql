ALTER TABLE expenses ADD COLUMN van_assignment_id INTEGER REFERENCES van_assignments(id);
