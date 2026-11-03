-- V47: demo placement talks and opportunities (companies come from V46)
INSERT INTO placement_talk (title, speaker_name, company_id, talk_at, venue_or_link, description, audience)
SELECT 'Cracking the aptitude round', 'Guest speaker, Demo Tech', c.id, '2026-12-10 15:00:00', 'Main Auditorium', 'Tips and practice questions for the written round.', 'ALL'
FROM company c WHERE c.name = 'Demo Tech Pvt Ltd';

INSERT INTO placement_talk (title, speaker_name, company_id, talk_at, venue_or_link, description, audience)
SELECT 'Careers in data and AI', 'Guest speaker, Sample Analytics', c.id, '2026-12-15 11:00:00', 'Lab 3 / Online', 'How to prepare for analytics internships and PPO offers.', 'ALL'
FROM company c WHERE c.name = 'Sample Analytics';

INSERT INTO placement_talk (title, speaker_name, company_id, talk_at, venue_or_link, description, audience)
VALUES ('Resume and ATS workshop', 'Placement cell', NULL, '2026-12-20 14:00:00', 'Seminar Hall 1', 'Build a resume that scores well with applicant tracking systems.', 'ALL');

INSERT INTO opportunity (type, title, organisation, description, link, location, stipend_or_package, start_date, end_date, deadline, final_year_only) VALUES
('HACKATHON', 'Demo Hack 2026', 'Pretend Systems', '24-hour build challenge on cloud tooling.', 'https://example.com/demo-hack', 'Online', 'Prizes up to 50,000', '2026-12-12', '2026-12-13', '2026-12-08 23:59:00', FALSE),
('INTERNSHIP', 'Summer Intern', 'Demo Tech Pvt Ltd', 'Eight-week software internship.', 'https://example.com/summer-intern', 'Pune', '20,000 per month', '2027-05-15', '2027-07-10', '2027-03-31 23:59:00', FALSE),
('OFF_CAMPUS', 'Graduate Trainee', 'Sample Analytics', 'Open to final-year students only.', 'https://example.com/graduate-trainee', 'Hyderabad', '7 LPA', NULL, NULL, '2027-01-31 23:59:00', TRUE);
