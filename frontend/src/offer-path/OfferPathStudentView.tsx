import { useState, useEffect, useMemo, useId } from 'react';
import type {
  StudentProfileDto,
  DriveDto,
  EligibilityResultDto,
  SimulationResponseDto,
} from '../auth/authApi';
import {
  fetchUpcomingDrives,
  fetchDriveEligibility,
  simulateOfferPath,
} from '../auth/authApi';

interface OfferPathStudentViewProps {
  readonly token: string;
  readonly studentProfile: StudentProfileDto | null;
  readonly onOpenAtsScanner?: () => void;
}

export default function OfferPathStudentView({
  token,
  studentProfile,
  onOpenAtsScanner,
}: OfferPathStudentViewProps) {
  const [drives, setDrives] = useState<DriveDto[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [selectedDriveId, setSelectedDriveId] = useState<number | null>(null);

  // Authoritative eligibility results per drive
  const [eligibilityMap, setEligibilityMap] = useState<Record<number, EligibilityResultDto>>({});
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [eligibilityFailed, setEligibilityFailed] = useState(false);

  // What-If Simulation State
  const defaultCgpa = studentProfile?.cgpa ?? 8.52;
  const defaultAttendance = 88.0;
  const defaultAts = studentProfile?.atsScore ?? 82;
  const defaultBacklogs = studentProfile?.activeBacklogs ?? 0;

  const [simCgpa, setSimCgpa] = useState<number>(defaultCgpa);
  const [simAttendance, setSimAttendance] = useState<number>(defaultAttendance);
  const [simAts, setSimAts] = useState<number>(defaultAts);
  const [simBacklogs, setSimBacklogs] = useState<number>(defaultBacklogs);

  const [simulationResult, setSimulationResult] = useState<SimulationResponseDto | null>(null);
  const [simulating, setSimulating] = useState(false);

  const isSimulating =
    Math.abs(simCgpa - defaultCgpa) > 0.01 ||
    Math.abs(simAttendance - defaultAttendance) > 0.5 ||
    simAts !== defaultAts ||
    simBacklogs !== defaultBacklogs;

  // Accessible unique IDs for form sliders
  const cgpaSliderId = useId();
  const attendanceSliderId = useId();
  const atsSliderId = useId();
  const backlogsSliderId = useId();

  // Load drives on mount
  useEffect(() => {
    setLoadingDrives(true);
    fetchUpcomingDrives()
      .then((res) => {
        setDrives(res.content);
        if (res.content.length > 0 && selectedDriveId === null) {
          setSelectedDriveId(res.content[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDrives(false));
  }, []);

  // Fetch authoritative eligibility for all drives or selected drive
  useEffect(() => {
    if (!token || drives.length === 0) return;
    setLoadingEligibility(true);

    Promise.all(
      drives.map(async (drive) => {
        try {
          const res = await fetchDriveEligibility(drive.id, token);
          return { driveId: drive.id, res };
        } catch {
          return null;
        }
      })
    )
      .then((results) => {
        const map: Record<number, EligibilityResultDto> = {};
        for (const item of results) {
          if (item) map[item.driveId] = item.res;
        }
        setEligibilityMap(map);
        setEligibilityFailed(results.some((item) => item === null));
      })
      .finally(() => setLoadingEligibility(false));
  }, [token, drives]);

  // Execute What-If simulation when sliders change
  useEffect(() => {
    if (!token || drives.length === 0) return;
    if (!isSimulating) {
      setSimulationResult(null);
      return;
    }

    const timer = setTimeout(() => {
      setSimulating(true);
      simulateOfferPath(
        {
          simulatedCgpa: simCgpa,
          simulatedAttendance: simAttendance,
          simulatedAtsScore: simAts,
          simulatedBacklogs: simBacklogs,
        },
        token
      )
        .then((res) => setSimulationResult(res))
        .catch(() => {})
        .finally(() => setSimulating(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [simCgpa, simAttendance, simAts, simBacklogs, isSimulating, token, drives.length]);

  // Reset simulation to official student facts
  const handleResetSimulation = () => {
    setSimCgpa(defaultCgpa);
    setSimAttendance(defaultAttendance);
    setSimAts(defaultAts);
    setSimBacklogs(defaultBacklogs);
    setSimulationResult(null);
  };

  // Compute live readiness score based on simulated or current eligibility
  const readinessMetrics = useMemo(() => {
    if (drives.length === 0) return { percent: 0, eligibleCount: 0, total: 0 };
    let eligible = 0;

    for (const drive of drives) {
      if (simulationResult) {
        // If simulated, check if newly unlocked or baseline eligible
        const unlocked = simulationResult.newlyUnlockedDrives.some((u) => u.driveId === drive.id);
        const baselineEligible = eligibilityMap[drive.id]?.eligible ?? false;
        if (unlocked || baselineEligible) eligible++;
      } else {
        if (eligibilityMap[drive.id]?.eligible) eligible++;
      }
    }

    const percent = Math.round((eligible / drives.length) * 100);
    return { percent, eligibleCount: eligible, total: drives.length };
  }, [drives, eligibilityMap, simulationResult]);

  const activeDrive = drives.find((d) => d.id === selectedDriveId) ?? drives[0];
  const activeEligibility = selectedDriveId ? eligibilityMap[selectedDriveId] : null;

  return (
    <div className="offer-path-view" style={{ display: 'grid', gap: '24px' }}>
      {/* Product Promise Banner */}
      <section
        className="pa-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(55, 48, 163, 0.08) 0%, rgba(15, 118, 110, 0.08) 100%)',
          borderColor: 'rgba(55, 48, 163, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--pa-color-teal)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Authoritative Differentiator
            </span>
            <h2 className="pa-display-heading" style={{ margin: '6px 0 8px', fontSize: '24px' }}>
              Student Offer Path & Eligibility Engine
            </h2>
            <p style={{ margin: 0, color: 'var(--pa-color-muted)', fontSize: '15px', maxWidth: '820px' }}>
              Placement Assistant doesn&apos;t merely display placement data. It explains{' '}
              <strong style={{ color: 'var(--pa-color-text)' }}>what a student needs to do next</strong>,{' '}
              <strong style={{ color: 'var(--pa-color-text)' }}>why a requirement matters</strong>, and{' '}
              <strong style={{ color: 'var(--pa-color-text)' }}>which opportunities become available</strong>.
            </p>
          </div>

          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'var(--pa-color-surface)',
              border: '1px solid var(--pa-color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '150px',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--pa-color-muted)' }}>
              Drive Readiness Rate
            </span>
            <span
              style={{
                fontFamily: 'var(--pa-font-display)',
                fontSize: '28px',
                fontWeight: 700,
                color: readinessMetrics.percent >= 66 ? '#10b981' : '#f59e0b',
              }}
            >
              {readinessMetrics.percent}%
            </span>
            <small style={{ fontSize: '11px', color: 'var(--pa-color-muted)' }}>
              {readinessMetrics.eligibleCount} of {readinessMetrics.total} Drives Qualified
            </small>
          </div>
        </div>

        {/* 5-Step Journey Rail */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--pa-color-border)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>✓</span>
              <span>1. Profile Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>✓</span>
              <span>2. Academic Facts Synced</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: defaultAttendance >= 75 ? '#10b981' : '#f59e0b', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>
                {defaultAttendance >= 75 ? '✓' : '!'}
              </span>
              <span>3. CRT Attendance Logged</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--pa-color-indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>⚡</span>
              <span><strong>4. Recruiter Engine Match</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--pa-color-saffron)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700 }}>★</span>
              <span><strong>5. What-If Simulation</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: What-If Simulation Panel & Authoritative Drives Explainer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>

        {/* =====================================================================
            5.2 & 5.3 WHAT-IF SIMULATION PANEL
            ===================================================================== */}
        <section
          className="pa-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
          aria-label="What-if Simulation Engine"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pa-color-saffron)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Hypothetical Scenario Explorer
              </span>
              <h3 className="pa-display-heading" style={{ margin: '4px 0', fontSize: '20px' }}>
                What-If Simulator
              </h3>
              <small style={{ color: 'var(--pa-color-muted)' }}>
                Test hypothetical academic improvements to discover newly unlocked drives in real time.
              </small>
            </div>

            {isSimulating && (
              <button
                type="button"
                className="quick-cred-btn"
                onClick={handleResetSimulation}
                style={{ fontSize: '12px', padding: '4px 12px' }}
                title="Reset sliders back to official academic records"
              >
                Reset Sliders
              </button>
            )}
          </div>

          {/* Critical Integrity Disclaimer Banner */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              fontSize: '12px',
              lineHeight: 1.45,
              color: 'var(--pa-color-text)',
            }}
          >
            <strong style={{ color: 'var(--pa-color-saffron)' }}>⚠️ Simulation Disclaimer:</strong>{' '}
            Simulated values are strictly hypothetical explorations. They do <em>not</em> modify your official college transcript, attendance records, or recruiter submission status.
          </div>

          {/* Slider 1: CGPA */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label htmlFor={cgpaSliderId} style={{ fontWeight: 600 }}>Cumulative CGPA</label>
              <div>
                <span style={{ color: 'var(--pa-color-muted)', fontSize: '12px' }}>Actual: {defaultCgpa.toFixed(2)} → </span>
                <strong style={{ color: simCgpa !== defaultCgpa ? 'var(--pa-color-saffron)' : 'inherit', fontSize: '14px' }}>
                  {simCgpa.toFixed(2)}
                </strong>
              </div>
            </div>
            <input
              id={cgpaSliderId}
              type="range"
              min={5.0}
              max={10.0}
              step={0.05}
              value={simCgpa}
              onChange={(e) => setSimCgpa(parseFloat(e.target.value))}
              aria-label="Simulated CGPA"
              aria-valuenow={simCgpa}
              style={{ width: '100%', accentColor: 'var(--pa-color-saffron)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--pa-color-muted)' }}>
              <span>5.00</span>
              <span>7.50 (Standard)</span>
              <span>8.50 (Tier 1)</span>
              <span>10.00</span>
            </div>
          </div>

          {/* Slider 2: Attendance % */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label htmlFor={attendanceSliderId} style={{ fontWeight: 600 }}>CRT & Class Attendance %</label>
              <div>
                <span style={{ color: 'var(--pa-color-muted)', fontSize: '12px' }}>Actual: {defaultAttendance.toFixed(0)}% → </span>
                <strong style={{ color: simAttendance !== defaultAttendance ? 'var(--pa-color-saffron)' : 'inherit', fontSize: '14px' }}>
                  {simAttendance.toFixed(0)}%
                </strong>
              </div>
            </div>
            <input
              id={attendanceSliderId}
              type="range"
              min={50}
              max={100}
              step={1}
              value={simAttendance}
              onChange={(e) => setSimAttendance(parseFloat(e.target.value))}
              aria-label="Simulated Attendance percentage"
              aria-valuenow={simAttendance}
              style={{ width: '100%', accentColor: 'var(--pa-color-saffron)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--pa-color-muted)' }}>
              <span>50%</span>
              <span>75% (Min Institutional Cutoff)</span>
              <span>85% (Recommended)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Slider 3: ATS Resume Score */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label htmlFor={atsSliderId} style={{ fontWeight: 600 }}>AI Resume ATS Score</label>
              <div>
                <span style={{ color: 'var(--pa-color-muted)', fontSize: '12px' }}>Actual: {defaultAts} → </span>
                <strong style={{ color: simAts !== defaultAts ? 'var(--pa-color-saffron)' : 'inherit', fontSize: '14px' }}>
                  {simAts} / 100
                </strong>
              </div>
            </div>
            <input
              id={atsSliderId}
              type="range"
              min={40}
              max={100}
              step={1}
              value={simAts}
              onChange={(e) => setSimAts(parseInt(e.target.value, 10))}
              aria-label="Simulated ATS Resume Score"
              aria-valuenow={simAts}
              style={{ width: '100%', accentColor: 'var(--pa-color-saffron)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--pa-color-muted)' }}>
              <span>40</span>
              <span>65 (Moderate)</span>
              <span>80+ (Recruiter Preferred)</span>
              <span>100</span>
            </div>
          </div>

          {/* Slider 4: Active Backlogs */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label htmlFor={backlogsSliderId} style={{ fontWeight: 600 }}>Active Backlogs</label>
              <div>
                <span style={{ color: 'var(--pa-color-muted)', fontSize: '12px' }}>Actual: {defaultBacklogs} → </span>
                <strong style={{ color: simBacklogs !== defaultBacklogs ? 'var(--pa-color-saffron)' : 'inherit', fontSize: '14px' }}>
                  {simBacklogs} {simBacklogs === 1 ? 'backlog' : 'backlogs'}
                </strong>
              </div>
            </div>
            <input
              id={backlogsSliderId}
              type="range"
              min={0}
              max={5}
              step={1}
              value={simBacklogs}
              onChange={(e) => setSimBacklogs(parseInt(e.target.value, 10))}
              aria-label="Simulated Active Backlogs"
              aria-valuenow={simBacklogs}
              style={{ width: '100%', accentColor: 'var(--pa-color-saffron)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--pa-color-muted)' }}>
              <span>0 (All Cleared)</span>
              <span>1 Backlog</span>
              <span>2 Backlogs</span>
              <span>5 Backlogs</span>
            </div>
          </div>

          {/* Live Simulation Feedback & Newly Unlocked Drives */}
          {simulating && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--pa-color-muted)' }}>
              Evaluating canonical eligibility rules against hypothetical parameters…
            </p>
          )}

          {simulationResult && (
            <div
              style={{
                marginTop: '6px',
                padding: '14px',
                borderRadius: '10px',
                background: simulationResult.newlyUnlockedDrives.length > 0 ? 'rgba(217, 119, 6, 0.12)' : 'var(--pa-color-page)',
                border: `1px solid ${simulationResult.newlyUnlockedDrives.length > 0 ? 'var(--pa-color-saffron)' : 'var(--pa-color-border)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px' }}>Simulation Outcome:</strong>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: simulationResult.newlyUnlockedDrives.length > 0 ? 'var(--pa-color-saffron)' : 'var(--pa-color-muted)',
                    color: '#fff',
                  }}
                >
                  {simulationResult.newlyUnlockedDrives.length} Newly Unlocked
                </span>
              </div>

              {simulationResult.newlyUnlockedDrives.length > 0 ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--pa-color-text)' }}>
                    🎯 Reaching these hypothetical targets would qualify you for:
                  </p>
                  {simulationResult.newlyUnlockedDrives.map((unlocked) => (
                    <div
                      key={unlocked.driveId}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--pa-color-surface)',
                        border: '1px solid var(--pa-color-border)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--pa-color-indigo)' }}>
                        {unlocked.companyName} — {unlocked.roleTitle}
                      </div>
                      <div style={{ marginTop: '4px', display: 'grid', gap: '2px' }}>
                        {unlocked.changedRules.map((trans, idx) => (
                          <div key={idx} style={{ color: '#10b981', fontSize: '11px' }}>
                            ✓ <strong>{trans.rule}:</strong> {trans.fromStatus} → {trans.toStatus} ({trans.reason})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--pa-color-muted)' }}>
                  No new drives unlocked under this simulation. You already meet active eligibility or further requirements (e.g. backlogs or branch restrictions) apply.
                </p>
              )}
            </div>
          )}
        </section>

        {/* =====================================================================
            5.1 AUTHORITATIVE DRIVE ELIGIBILITY & NEXT ACTION EXPLAINER
            ===================================================================== */}
        <section
          className="pa-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
          aria-label="Authoritative Eligibility Explainer"
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pa-color-indigo)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Authoritative Eligibility Contract
            </span>
            <h3 className="pa-display-heading" style={{ margin: '4px 0', fontSize: '20px' }}>
              Placement Drive Rules
            </h3>
            <small style={{ color: 'var(--pa-color-muted)' }}>
              Deterministic evaluation powered by the Placement Assistant rule engine.
            </small>
          </div>

          {eligibilityFailed && (
            <p role="alert" style={{ margin: 0, fontSize: '13px', color: '#b45309' }}>
              Some drives could not be checked right now. They are shown in grey, not as ineligible.
            </p>
          )}
          {/* Drive Selector Tabs */}
          {loadingDrives ? (
            <p style={{ color: 'var(--pa-color-muted)', fontSize: '13px' }}>Loading placement drives…</p>
          ) : (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {drives.map((drive) => {
                const el = eligibilityMap[drive.id];
                const isSelected = drive.id === (activeDrive?.id ?? 0);
                const isNewlyUnlocked = simulationResult?.newlyUnlockedDrives.some((u) => u.driveId === drive.id);

                return (
                  <button
                    key={drive.id}
                    type="button"
                    onClick={() => setSelectedDriveId(drive.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid var(--pa-color-indigo)' : '1px solid var(--pa-color-border)',
                      background: isSelected ? 'rgba(55, 48, 163, 0.08)' : 'var(--pa-color-page)',
                      color: isSelected ? 'var(--pa-color-indigo)' : 'var(--pa-color-text)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{drive.companyName}</span>
                    {isNewlyUnlocked ? (
                      <span style={{ background: 'var(--pa-color-saffron)', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                        UNLOCKED
                      </span>
                    ) : (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: el ? (el.eligible ? '#10b981' : '#ef4444') : '#9ca3af',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Drive Details & Rule Breakdown */}
          {activeDrive && (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'var(--pa-color-page)',
                  border: '1px solid var(--pa-color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pa-color-indigo)' }}>
                      {activeDrive.companyName}
                    </span>
                    <h4 style={{ margin: '2px 0 4px', fontSize: '17px' }}>{activeDrive.roleTitle}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--pa-color-muted)' }}>
                      Deadline: <strong>{activeDrive.driveDate}</strong> · Location: {activeDrive.jobLocation ?? 'PAN India'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--pa-color-teal)' }}>
                      {activeDrive.ctcLpa ? `${activeDrive.ctcLpa} LPA` : 'Competitive'}
                    </div>
                    {!activeEligibility && !loadingEligibility && (
                      <span className="eligibility-pill" style={{ display: 'inline-block', marginTop: '4px' }}>
                        Could not check eligibility
                      </span>
                    )}
                    {activeEligibility && (
                      <span
                        className={`eligibility-pill ${activeEligibility.eligible ? 'pass' : 'fail'}`}
                        style={{ display: 'inline-block', marginTop: '4px' }}
                      >
                        {activeEligibility.eligible ? '✓ Fully Eligible' : '✕ Ineligible'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Authoritative Rules List */}
              <div style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--pa-color-muted)' }}>
                  AUTHORITATIVE CRITERIA BREAKDOWN:
                </span>

                {loadingEligibility ? (
                  <p style={{ fontSize: '12px', color: 'var(--pa-color-muted)' }}>Evaluating rules…</p>
                ) : activeEligibility?.rules && activeEligibility.rules.length > 0 ? (
                  activeEligibility.rules.map((ruleItem, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'var(--pa-color-surface)',
                        border: '1px solid var(--pa-color-border)',
                        display: 'grid',
                        gap: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{ruleItem.rule}</strong>
                          <span style={{ color: 'var(--pa-color-muted)', marginLeft: '8px' }}>
                            (Required: {ruleItem.expected ?? 'Strict Condition'})
                          </span>
                        </div>
                        <span
                          className={`eligibility-pill ${
                            ruleItem.status === 'PASS' ? 'pass' : ruleItem.status === 'MISSING' ? 'amber' : 'fail'
                          }`}
                        >
                          {ruleItem.status}
                        </span>
                      </div>

                      <div style={{ color: 'var(--pa-color-muted)', fontSize: '11px' }}>
                        Actual: <strong>{ruleItem.actual}</strong> vs Target: <strong>{ruleItem.expected}</strong>
                      </div>

                      {ruleItem.nextAction && (
                        <div
                          style={{
                            marginTop: '2px',
                            color: ruleItem.status === 'PASS' ? '#10b981' : 'var(--pa-color-saffron)',
                            fontWeight: 600,
                            fontSize: '11px',
                          }}
                        >
                          👉 <strong>Next Action:</strong> {ruleItem.nextAction}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--pa-color-page)', fontSize: '12px' }}>
                    Standard drive criteria (CGPA: {activeDrive.minCgpa ?? 7.0}, Max Backlogs: {activeDrive.maxBacklogs ?? 0}, Min Attendance: {activeDrive.minCrtAttendance ?? 75}%).
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="pa-button-primary"
                  style={{
                    flex: 1,
                    opacity: activeEligibility?.eligible ? 1 : 0.6,
                    cursor: activeEligibility?.eligible ? 'pointer' : 'not-allowed',
                  }}
                  disabled={!activeEligibility?.eligible}
                  onClick={() => {
                    alert(`Official application submitted for ${activeDrive.companyName} (${activeDrive.roleTitle})!`);
                  }}
                >
                  {activeEligibility?.eligible ? '✓ Apply for Recruitment Drive →' : 'Ineligible — Review Actions Above'}
                </button>

                {onOpenAtsScanner && (
                  <button
                    type="button"
                    className="quick-cred-btn"
                    onClick={onOpenAtsScanner}
                    style={{ padding: '0 16px', fontSize: '12px' }}
                  >
                    📄 Optimize Resume
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
