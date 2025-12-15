/**
 * Comprehensive dashboard warning lights and indicators knowledge base
 * Used by both photo analysis and video assistant modes
 */

export const DASHBOARD_INDICATORS_KNOWLEDGE = `
## DASHBOARD WARNING LIGHTS & INDICATORS GUIDE

### 🔴 RED INDICATORS — CRITICAL (Stop driving immediately)

**ENGINE OIL PRESSURE (Oil can icon)**
- Appearance: Oil can with drop, sometimes with wavy lines
- Meaning: Low oil pressure — engine damage imminent
- Action: STOP immediately, turn off engine, check oil level
- Causes: Low oil, oil pump failure, leak, worn bearings
- Risk: Engine seizure within minutes if ignored

**ENGINE TEMPERATURE / OVERHEATING (Thermometer in water)**
- Appearance: Thermometer with wavy lines below
- Meaning: Engine overheating
- Action: Pull over safely, turn off AC, let engine cool
- Causes: Low coolant, thermostat failure, radiator issue, water pump
- Risk: Head gasket failure, warped cylinder head

**BRAKE SYSTEM (Circle with "!" or "BRAKE")**
- Appearance: Circle with exclamation mark, or text "BRAKE"
- Meaning: Brake system failure or handbrake engaged
- If handbrake released and still on: STOP driving
- Causes: Low brake fluid, worn pads, ABS failure, sensor issue
- Risk: Complete brake failure

**BATTERY / CHARGING (Battery icon)**
- Appearance: Battery with + and - terminals
- Meaning: Charging system failure
- Action: Drive to nearest safe location, avoid using electrical systems
- Causes: Alternator failure, loose belt, battery dying
- Risk: Engine will stop when battery drains (30-60 min)

**AIRBAG / SRS (Seated person with circle)**
- Appearance: Person in seat with airbag (circle) in front
- Meaning: Airbag system malfunction
- Action: Safe to drive but airbags may not deploy in crash
- Causes: Sensor fault, wiring issue, clock spring, seat belt pretensioner

**POWER STEERING (Steering wheel with "!")**
- Appearance: Steering wheel icon, sometimes with exclamation
- Meaning: Power steering failure
- Action: Car is drivable but steering will be heavy
- Causes: EPS motor, fluid leak (hydraulic), belt issue

### 🟡 YELLOW/AMBER INDICATORS — WARNING (Check soon)

**CHECK ENGINE / MIL (Engine outline)**
- Appearance: Engine block outline, sometimes with text "CHECK"
- Meaning: Engine/emission system issue detected
- Solid: Non-urgent fault, schedule service
- Flashing: Misfire detected — reduce speed, avoid hard acceleration
- Causes: O2 sensor, catalytic converter, ignition, fuel system, vacuum leak

**ABS (Circle with "ABS")**
- Appearance: Letters "ABS" in circle
- Meaning: Anti-lock braking malfunction
- Action: Normal brakes work, but ABS won't activate
- Causes: Wheel speed sensor, ABS module, wiring

**TRACTION CONTROL / ESP (Car with wavy lines)**
- Appearance: Car with skid marks / wavy lines below
- Blinking: System actively working (normal on slippery surface)
- Solid: System disabled or faulty
- Causes: Wheel speed sensor, steering angle sensor

**TIRE PRESSURE / TPMS (Tire cross-section with "!")**
- Appearance: Flat tire shape with exclamation mark
- Meaning: One or more tires below recommended pressure
- Action: Check all tire pressures including spare
- Also appears: After tire rotation or new tires (needs reset)

**LOW FUEL (Gas pump icon)**
- Appearance: Fuel pump icon
- Meaning: ~50-80km range remaining (varies by car)
- Action: Refuel soon, avoid running on empty (damages fuel pump)

**ENGINE WARNING LIGHT (Amber engine)**
- See CHECK ENGINE above

**GLOW PLUG (Diesel only) (Coil/spring icon)**
- Appearance: Coiled wire/spring shape
- Meaning: Wait before starting (cold weather) or glow plug fault
- Normal: Lights briefly then turns off
- Stays on: Glow plug or injector issue

**DPF / DIESEL PARTICULATE FILTER**
- Appearance: Box with dots inside, or exhaust with particles
- Meaning: DPF needs regeneration
- Action: Drive at highway speed (60+ km/h) for 15-20 min
- Causes: Too many short trips, incomplete regeneration

**SERVICE REQUIRED / SPANNER**
- Appearance: Wrench/spanner icon
- Meaning: Scheduled maintenance due
- Action: Book service appointment

### 🟢 GREEN/BLUE INDICATORS — INFORMATIONAL

**TURN SIGNALS (Arrows)**
- Left or right arrow, blinking
- Normal operation indicator

**HIGH BEAM (Blue headlight)**
- Appearance: Headlight with horizontal lines
- Blue color indicates high beams active

**LOW BEAM (Green headlight)**
- Appearance: Headlight with angled lines down
- Green indicates low beams active

**FOG LIGHTS (Headlight with wavy line)**
- Front fog: Beam with wavy vertical line
- Rear fog: Beam going right with wavy line

**CRUISE CONTROL (Speedometer with arrow)**
- Indicates cruise control active

**ECO MODE (Leaf or "ECO")**
- Economy driving mode active

**SPORT MODE ("S" or "SPORT")**
- Sport driving mode active

### ⚪ WHITE/BLUE INDICATORS — STATUS

**FROST WARNING (Snowflake)**
- Exterior temperature below 4°C / 39°F
- Watch for icy roads

**DOOR AJAR (Car with open door)**
- One or more doors not fully closed

**TRUNK OPEN (Car with open trunk)**
- Trunk/boot not fully closed

**HOOD OPEN (Car with open hood)**
- Hood/bonnet not latched

**SEATBELT (Person with belt)**
- Driver or passenger not buckled

**KEY/IMMOBILIZER (Key outline or car with key)**
- Key not detected or immobilizer active

### COMMON MULTI-COLOR INDICATORS

**COOLANT TEMPERATURE**
- Blue: Engine cold, drive gently
- Normal: Light off (optimal temperature)
- Red: Overheating (see critical section)

**BATTERY**
- Brief flash on start: Normal self-test
- Stays on while driving: Charging failure (RED)

### MANUFACTURER-SPECIFIC SYMBOLS

**BMW**
- Yellow half-circle with "!" = Tire pressure
- Yellow steering wheel = Dynamic Stability Control
- Yellow engine = Service Engine Soon (different from Check Engine)

**Mercedes-Benz**
- ATTENTION ASSIST (coffee cup) = Take a break
- PRE-SAFE = Collision detection active

**Volkswagen/Audi**
- EPC = Electronic Power Control (throttle/engine issue)
- Yellow steering wheel + "!" = Power steering

**Volvo**
- Yellow triangle with "!" = General warning, check message display

### DIAGNOSTIC APPROACH

When analyzing dashboard photos:
1. Identify ALL illuminated indicators
2. Prioritize by color: RED > YELLOW > GREEN/BLUE
3. Note if lights are solid or flashing
4. Check for combinations (multiple warnings often related)
5. Consider context (engine running vs. key-on only)

Common combinations:
- ABS + Traction + Brake = Wheel speed sensor failure
- Check Engine + Traction = Engine issue affecting stability
- Battery + multiple lights = Electrical system failure
`;

/**
 * Get the dashboard indicators prompt section for photo analysis
 */
export function getDashboardAnalysisPrompt(): string {
  return `
DASHBOARD INDICATOR ANALYSIS:

When you see a dashboard photo, you MUST:
1. Scan the ENTIRE dashboard for any illuminated warning lights
2. Identify each light by its symbol, color, and state (solid/flashing)
3. Prioritize RED indicators as critical
4. Explain what each indicator means
5. Provide specific action recommendations
6. Note any dangerous combinations

${DASHBOARD_INDICATORS_KNOWLEDGE}

RESPONSE FORMAT for dashboard photos:
Include a section "⚠️ Dashboard Indicators Detected:" listing each light with:
- Symbol description
- Color (red/yellow/green/blue)
- Meaning
- Urgency level
- Recommended action
`;
}

/**
 * Get condensed version for video mode (shorter for real-time)
 */
export function getDashboardVideoPrompt(): string {
  return `
DASHBOARD INDICATOR RECOGNITION:

If you see a car dashboard in the video frame, immediately identify any warning lights:

CRITICAL (RED) - Announce immediately:
- Oil pressure (oil can) → "STOP! Low oil pressure detected"
- Temperature (thermometer) → "Warning: Engine overheating"
- Brake (circle with !) → "Brake system warning"
- Battery → "Charging system failure"

WARNING (YELLOW) - Mention clearly:
- Check Engine → "Check engine light is on"
- ABS → "ABS warning light"
- Tire Pressure → "Low tire pressure warning"
- Traction Control → "Stability control warning"

Describe the color and shape of any unrecognized indicators and ask the user for more details.

ALWAYS announce dashboard warnings with urgency level and basic explanation.
`;
}
