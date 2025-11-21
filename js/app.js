// Global variables for modal and sheet data
const eomSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0Km9p6XYDDxyGYSFfUjDjhdKMtr_hFvCiJ-U5_24_-QKrGsexZ4v3dxzKp0K1XZenNsiV7CiNmQEt/pub?output=csv';
let leaderboardData = []; // Store the fetched data here
const tbtData = [
    { title: " TBT of The Day Alcohol and Drugs", link: "https://drive.google.com/file/d/1uIGAjyY2UuxdkWToEGqMoF-L1Q9cIn5c/view?usp=drivesdk" },
    { title: " TBT of The Day Biohazard infection materials", link: "https://drive.google.com/file/d/1wUY8mlaEXOroUK5IoPPbBpym97Jdjfm4/view?usp=drivesdk" },
    { title: " TBT of The Day Cold Weather", link: "https://drive.google.com/file/d/1QOp3TVAb-si19p-taHpPjSwEfXs1O5us/view?usp=drivesdk" },
    { title: " TBT of The Day Compressed Gas", link: "https://drive.google.com/file/d/1a7tLsOI7Re7QAWDivisUFdakbvpSEYOt/view?usp=drivesdk" },
    { title: " TBT of The Day Construction Fires", link: "https://drive.google.com/file/d/1nXBiIuAEjs4om2NwASqfyhtT-8IUBpGt/view?usp=drivesdk" },
    { title: " TBT of The Day Corrosive Materials", link: "https://drive.google.com/file/d/1VaFxPYhYt0Ho8blbkGQi2S4ubsT882ge/view?usp=drivesdk" },
    { title: " TBT of The Day Dangerously reactive material", link: "https://drive.google.com/file/d/16CNFN5iuf3YFyVW-tYNVQgHkRu8z8deg/view?usp=drivesdk" },
    { title: " TBT of The Day Dial before you Dig", link: "https://drive.google.com/file/d/1YlWyaHh2lPoum-OYYoJ2qP8t948qwLZI/view?usp=drivesdk" },
    { title: " TBT of The Day Driving in Reverse", link: "https://drive.google.com/file/d/1QzLSWz3CFfjGdmj62OsFdvT5IcV_lrqJ/view?usp=drivesdk" },
    { title: " TBT of The Day Emergency Response", link: "https://drive.google.com/file/d/1bWiXimPy6SmqbtEs5LxJE9zvS765GSzN/view?usp=drivesdk" },
    { title: " TBT of The Day Equipment Guards", link: "https://drive.google.com/file/d/1i4o3HHM6O2EPJ1hf-2IQ97_AREDCMIDr/view?usp=drivesdk" },
    { title: " TBT of The Day Exercise and Health", link: "https://drive.google.com/file/d/13pnUXqSmGNuXHAGKG7TyKhwryEWbtAaO/view?usp=drivesdk" },
    { title: " TBT of The Day Eye Protection", link: "https://drive.google.com/file/d/13HufH-DcwH-P-pEZZKTUNzHSo2lzyzLa/view?usp=drivesdk" },
    { title: " TBT of The Day Fall Protection", link: "https://drive.google.com/file/d/1I_MQHppz0KnwIgiTiLwpLUPyd0N-z1c_/view?usp=drivesdk" },
    { title: " TBT of The Day Fatigue", link: "https://drive.google.com/file/d/1jidO7NprdqLowWkXEXKtWBPBq5iwI9yA/view?usp=drivesdk" },
    { title: "TBT of The Day Flammable and Combustible Materials", link: "https://drive.google.com/file/d/1Gcbe3miY43cJYkW6a7sTO7mbC8m31ICL/view?usp=drivesdk" },
    { title: "TBT of The Day Foot Protection", link: "https://drive.google.com/file/d/1aQJxutEcqL2H_mcnSBK9uuj2silzAyRl/view?usp=drivesdk" },
    { title: " TBT of The Day Grinders", link: "https://drive.google.com/file/d/1jJqncsuUSmrF2dPlqlLz28jRN73H-RBe/view?usp=drivesdk" },
    { title: " TBT of The Day Hand Protection", link: "https://drive.google.com/file/d/1LOiKyFoMb3dsR_pYyJECJLxCMFpEhpFT/view?usp=drivesdk" },
    { title: " TBT of The Day Hazardous Waste", link: "https://drive.google.com/file/d/1pLR9ewUgc0Memjx3BLiOnSW-4MWf7IKe/view?usp=drivesdk" },
    { title: " TBT of The Day Head Protection", link: "https://drive.google.com/file/d/1BlmB3NNKNldC0xMH-c_j-KqlmDva_loF/view?usp=drivesdk" },
    { title: " TBT of The Day Hearing", link: "https://drive.google.com/file/d/191qRYe-ZVNfcSGHBtm6TLK4rVAOFtKTh/view?usp=drivesdk" },
    { title: " TBT of The Day Hot Weather", link: "https://drive.google.com/file/d/1to9Fzdpv5bu3GQm98prLzFSjpuHAmuUh/view?usp=drivesdk" },
    { title: " TBT of The Day Housekeeping", link: "https://drive.google.com/file/d/1iTMdIu08H0H-0S03mxMrlawHSWhjEf-c/view?usp=drivesdk" },
    { title: " TBT of The Day Inspection of Tools", link: "https://drive.google.com/file/d/1kNXJxumw42uQe1eGdBLZ-KlKEoI_ctF6/view?usp=drivesdk" },
    { title: " TBT of The Day Ladder Safety", link: "https://drive.google.com/file/d/1KO_-SERnB-IE68KL-cmxxG6dVkFVERUq/view?usp=drivesdk" },
    { title: " TBT of The Day Locking Out", link: "https://drive.google.com/file/d/1AhXs6ej3cDXk5gAIQAt09ySwAtZV7dn8/view?usp=drivesdk" },
    { title: " TBT of The Day Material Safety Data Sheet", link: "https://drive.google.com/file/d/1hpf53QlwxLDp0VZC6F5TBZ1NTZuId6Gp/view?usp=drivesdk" },
    { title: " TBT of The Day Oxidizing Materials", link: "https://drive.google.com/file/d/10dBlB83VwTiGtbN5RteXckS7rbmUaekS/view?usp=drivesdk" },
    { title: " TBT of The Day Personal Protective Equipment", link: "https://drive.google.com/file/d/1IfAiA0mVIrLEGIxip-YhrhFyLhGCC0Yk/view?usp=drivesdk" },
    { title: " TBT of The Day Pinch Points and Blinds", link: "https://drive.google.com/file/d/1fFNrba9aIgQxXcbiaLnjb5FqHsKTGjPG/view?usp=drivesdk" },
    { title: " TBT of The Day Poisonous and Infectious Materials", link: "https://drive.google.com/file/d/1g1hsd8OIgPt6njOeSNozajuAiVJNKMlX/view?usp=drivesdk" },
    { title: " TBT of The Day Power Lines", link: "https://drive.google.com/file/d/1Sqlm3-z9cZ6RaOFqVPL-A4sZ1pnxDxLD/view?usp=drivesdk" },
    { title: " TBT of The Day Power Saws", link: "https://drive.google.com/file/d/1WiTJbh7uaGCTwzUHo5EUMa6vYl-hzMBj/view?usp=drivesdk" },
    { title: " TBT of The Day Proper Lifting and Back Care", link: "https://drive.google.com/file/d/10EutgMs_0XH_VJvF2_vIYcQRIlPQtN_4/view?usp=drivesdk" },
    { title: " TBT of The Day Reporting Accidents", link: "https://drive.google.com/file/d/1AoADCkqOQxoWMIkQkNa2S71FzZzra4s6/view?usp=drivesdk" },
    { title: " TBT of The Day Reporting Near Miss and incident", link: "https://drive.google.com/file/d/1W5yhuJrbdaO27S2B-TnPbTVVKkCSnIFG/view?usp=drivesdk" },
    { title: " TBT of The Day Respiratory Protective", link: "https://drive.google.com/file/d/1QX86Iu4RJj5bvdzWdJgtKAy8-LIRR8x7/view?usp=drivesdk" },
    { title: " TBT of The Day Roofing", link: "https://drive.google.com/file/d/17INX1mFhwxHsxyM8A6Vbd98jywHDFN08/view?usp=drivesdk" },
    { title: " TBT of The Day Scaffold Safety", link: "https://drive.google.com/file/d/1BPzGrFJMuA9eDl46zhh7iQqMYqqnMwLS/view?usp=drivesdk" },
    { title: " TBT of The Day Signs", link: "https://drive.google.com/file/d/1RfT2WDhQnOW_8FTv2t80UfhXO14uEmxJ/view?usp=drivesdk" },
    { title: " TBT of The Day Slips and Trips", link: "https://drive.google.com/file/d/11QSqSs0SWcXHjzNQMrjDtumrKtM5Wp0u/view?usp=drivesdk" },
    { title: " TBT of The Day Stretching", link: "https://drive.google.com/file/d/1dD54piQQtbjhhw3u_4bCLSfjp9cd5Jtr/view?usp=drivesdk" },
    { title: " TBT of The Day Traffic Control People", link: "https://drive.google.com/file/d/1aLbvfU2E4OpsYv4UkjTa4Y6QEupxDwPI/view?usp=drivesdk" },
    { title: " TBT of The Day Transportation of Goods", link: "https://drive.google.com/file/d/1rbuTSg_MTsr_gwxGNWAyyPeBvZpNOGHL/view?usp=drivesdk" },
    { title: " TBT of The Day Trenching and Excavating", link: "https://drive.google.com/file/d/1CKOVtAR5iGz0PVQz51adhC6ZXjtEJgV_/view?usp=drivesdk" },
    { title: " TBT of The Day Working Around Mobile Equipment", link: "https://drive.google.com/file/d/14SncgzRAVHd8-kJNGmZVroYuS42TshEr/view?usp=drivesdk" },
    { title: " TBT of The Day Working With Hazardous Materials", link: "https://drive.google.com/file/d/1gYF6cUISYjUZF_pLEKadmPbe49YM2_ph/view?usp=drivesdk" }
];
// JSA Data structure: { title: "JSA Title", link: "Google Drive Link" }
const jsaData = [
        { title: "Abrasive Blasting And Coating", link: "https://drive.google.com/file/d/1tZBj37GGJ7h9uRYDI5TIL04OkNrEMoLu/view?usp=drivesdk" },
        { title: "Backfilling Levelling And Compaction", link: "https://drive.google.com/file/d/1I32miHCfXBzETNx5UePxwHY4f9Fi-Fd1/view?usp=drivesdk" },
         { title: "Backfilling Levelling And Compaction Around Cellar", link: "https://drive.google.com/file/d/1Fiei1faeqkuNCxR_-FMOlBF66w1ELC-0/view?usp=drivesdk" },
        { title: "Bolt Tightening And Torquing Activity", link: "https://drive.google.com/file/d/1iEyD5UObnaZ0TppEgmsAI-I0ELzJz7ce/view?usp=drivesdk" },
        { title: "Concrete-Rock Breaking Using Jackhammer Near X-Mas Tree", link: "https://drive.google.com/file/d/1YlO786qpo1mSVZVumvLFE3PQIKHGQPUk/view?usp=drivesdk" },
        { title: "Construction Of Anchor", link: "https://drive.google.com/file/d/1PB8DeTYv3HbdlTSVdWWGtWYl5gJBmrIL/view?usp=drivesdk" },
        { title: "Construction Of Burn Pit", link: "https://drive.google.com/file/d/1__bqRlMFSgajPvS6oED9aEUBrwtSr-Bu/view?usp=drivesdk" },
        { title: "Construction Of Burn Pit Steps", link: "https://drive.google.com/file/d/1XC1vj7NElbWebkcabBR-9DjzCkYrzE0P/view?usp=drivesdk" },
        { title: "Construction Of Cellar", link: "https://drive.google.com/file/d/15h6wy8n7-Ln62Q2wCn4tt0vFsgORn4pM/view?usp=drivesdk" },
        { title: "Construction Of Fence", link: "https://drive.google.com/file/d/1jC5ueNSMMf-FajaZbWUAfDKqeUclf424/view?usp=drivesdk" },
        { title: "Crane Operation", link: "https://drive.google.com/file/d/1gIrFbzHOc7UJ0Xn8g90B-V7gfodsZERp/view?usp=drivesdk" },
        { title: "Cutting And Removing Of Steel Cellar", link: "https://drive.google.com/file/d/18olhXtw1lv-Vaiy9BzM322aMzaESqx5j/view?usp=drivesdk" },
        { title: "E And I Activity", link: "https://drive.google.com/file/d/1Bkn9C9pdeI1RLbIwexKcrODbHhUoPeYA/view?usp=drivesdk" },
        { title: "Excavation Around Steel Cellar", link: "https://drive.google.com/file/d/1e9oPOsHb86VB98WWXLnXgSchM90wOLu8/view?usp=drivesdk" },
        { title: "Excavation For Foundation, Riser, And Anchor", link: "https://drive.google.com/file/d/1jERBdkEd9qmRx681gsr9hNVriuAxstoZ/view?usp=drivesdk" },
        { title: "Excavation For Well Head Trenches", link: "https://drive.google.com/file/d/1LQpvjINei7UpB9EDTWWrfBD-kImbDe3B/view?usp=drivesdk" },
        { title: "Final Levelling And Compaction", link: "https://drive.google.com/file/d/1UuyTcFwx2Xri58-WyA5YhkEgUuVYcrR9/view?usp=drivesdk" },
        { title: "Grouting Activity", link: "https://drive.google.com/file/d/1_Z9N9nmllUffi0wQonQjKYGAXKOQVdMO/view?usp=drivesdk" },
        { title: "Hand Excavation For Exposing Existing Ug Facility", link: "https://drive.google.com/file/d/1tADi51OZAgwGoIFpAul1uyq4z4WKGsTO/view?usp=drivesdk" },
        { title: "Leak Testing For Tubing", link: "https://drive.google.com/file/d/1yvHoWnV1tc_zN7k4vCp_girvot7QQeZv/view?usp=drivesdk" },
        { title: "Levelling And Compaction For Anchor Base", link: "https://drive.google.com/file/d/1nU2f6qvX-JWTozC4xz0M3OVGOURGGKsv/view?usp=drivesdk" },
        { title: "Levelling And Compaction For Cellar Base", link: "https://drive.google.com/file/d/1Mp77FAgB9Lfh7C6hmeW4jGo_W3qmPcx/view?usp=drivesdk" },
        { title: "Loading & Unloading Activity Using Fork", link: "https://drive.google.com/file/d/1qX1aw1BTySOnECTnDK0s1d1iY3ta2H7_/view?usp=drivesdk" },
        { title: "Mobilization Demobilization", link: "https://drive.google.com/file/d/1wwMo2li6LxdkvRkULe5h5tQ0IdjE0OTP/view?usp=drivesdk" },
        { title: "Mobile Crane Operation", link: "https://drive.google.com/file/d/1fEK4a16-l9DOPcAzmUfKwjWjMkefy2Yz/view?usp=drivesdk" },
        { title: "Pre Commissioning And I-O Mapping Activity", link: "https://drive.google.com/file/d/1DtPI-d6rb9fGyuAxOQ_w1z6yNMLpYfZG/view?usp=drivesdk" },
        { title: "Scaffold Erection - Dismantling", link: "https://drive.google.com/file/d/1feJtE40cX2bxdWJxoDgHrHEiqbip0ouo/view?usp=drivesdk" },
        { title: "Shutdown Activity", link: "https://drive.google.com/file/d/1RsZuqzBAVFmzl3awpk7b_X0CZrvktZE9/view?usp=drivesdk" },
        { title: "Survey Activity", link: "https://drive.google.com/file/d/10NWWZaHMJ7yl3bh9z6hNU14UUkpx2Pd1/view?usp=drivesdk" },
        { title: "Threading & Bending Of Pipe Using Threading Machine", link: "https://drive.google.com/file/d/1s6YuKlgJwzlJXX-y-IStKX-8ZPPRsinZ/view?usp=drivesdk" },
        { title: "Welding, Cutting, Grinding & Drilling Activity", link: "https://drive.google.com/file/d/1l7FSBkX0vYrueQFhw3zZ6gofwp_u-zCp/view?usp=drivesdk" },
        { title: "Welding Cutting And Grinding Activity", link: "https://drive.google.com/file/d/1BF3wr5G-M1ZQM4jRUtRlpXRoehyPYy2B/view?usp=drivesdk" },
        { title: "Working At Height", link: "https://drive.google.com/file/d/1q_IvI7ZVb-2JmL1S2xP4kyhKz14V1Jv3/view?usp=drivesdk" },
        { title: "Xray And Pmi", link: "https://drive.google.com/file/d/1VglyFHzLiNFCBBQrG00vQ1lW3OtsQNfk/view?usp=drivesdk" }

];

// 🆕 KPI Data & Logic
const kpiData = [
    {
      id: 1, category: "Lagging", name: "TRIR (Total Recordable Incident Rate)", formula: "rate_200k",
      inputs: [{ name: "incidents", label: "Recordable Incidents" }, { name: "hours", label: "Total Man-hours" }],
      targetStr: "< 0.05", targetVal: 0.05, targetType: "max",
      source: "CSM Vol I, Section 2.0; Safety Handbook"
    },
    {
      id: 2, category: "Lagging", name: "LTI Rate (Lost Time Injury Rate)", formula: "rate_200k",
      inputs: [{ name: "lti", label: "Lost Time Injuries" }, { name: "hours", label: "Total Man-hours" }],
      targetStr: "0.00", targetVal: 0.00, targetType: "max",
      source: "CSM Vol I, Section 2.0; CSM Vol II, Ch 1"
    },
    {
      id: 3, category: "Lagging", name: "Motor Vehicle Accident Rate", formula: "rate_1m",
      inputs: [{ name: "mva", label: "MVA Count" }, { name: "km", label: "Kilometers Driven" }],
      targetStr: "0.00", targetVal: 0.00, targetType: "max",
      source: "CSM Vol II, Ch 8; Safety Handbook"
    },
    {
      id: 4, category: "Leading", name: "Work Permit Compliance %", formula: "percentage",
      inputs: [{ name: "pass", label: "Permits Passed Audit" }, { name: "total", label: "Total Permits Audited" }],
      targetStr: "100%", targetVal: 100, targetType: "min",
      source: "CSM Vol II, Ch 4 (Work Permits)"
    },
    {
      id: 5, category: "Leading", name: "PPE Compliance Rate", formula: "percentage",
      inputs: [{ name: "pass", label: "Workers with Correct PPE" }, { name: "total", label: "Total Workers Observed" }],
      targetStr: "100%", targetVal: 100, targetType: "min",
      source: "CSM Vol II, Ch 3 (PPE)"
    },
    {
      id: 6, category: "Leading", name: "Toolbox Talk Participation %", formula: "percentage",
      inputs: [{ name: "pass", label: "Personnel Attended" }, { name: "total", label: "Total Personnel on Site" }],
      targetStr: "100%", targetVal: 100, targetType: "min",
      source: "CSM Vol I; Safety Handbook"
    },
    {
      id: 7, category: "Leading", name: "Hazard ID Closure Rate", formula: "percentage",
      inputs: [{ name: "pass", label: "Conditions Closed" }, { name: "total", label: "Conditions Identified" }],
      targetStr: "100%", targetVal: 100, targetType: "min",
      source: "CSM Vol I, Sec 2; Safety Handbook"
    }
];

function renderKPIs() {
    const container = document.getElementById('kpiListContainer');
    if(!container) return;
    container.innerHTML = '';

    kpiData.forEach(kpi => {
        const card = document.createElement('div');
        card.className = 'kpi-card';
        card.style.borderLeftColor = 'var(--kpi-color)';
        
        const badgeClass = kpi.category.toLowerCase();
        
        let inputsHTML = '';
        kpi.inputs.forEach(input => {
            inputsHTML += `
                <div class="kpi-input-group">
                    <label>${input.label}</label>
                    <input type="number" class="kpi-input-field" data-kpi-id="${kpi.id}" data-field="${input.name}" placeholder="0" oninput="calculateKPI(${kpi.id})">
                </div>
            `;
        });

        card.innerHTML = `
            <div class="kpi-header">
                <h4 class="kpi-title">${kpi.name}</h4>
                <span class="kpi-badge ${badgeClass}">${kpi.category}</span>
            </div>
            <div class="kpi-inputs">
                ${inputsHTML}
            </div>
            <div class="kpi-footer">
                <div class="kpi-result-box">
                    <div class="kpi-result-label">Target: ${kpi.targetStr}</div>
                    <div class="kpi-result-value text-neutral" id="result-${kpi.id}">-</div>
                </div>
            </div>
            <div class="kpi-citation">Source: ${kpi.source}</div>
        `;
        container.appendChild(card);
    });
}

function calculateKPI(id) {
    const kpi = kpiData.find(k => k.id === id);
    const inputs = document.querySelectorAll(`input[data-kpi-id="${id}"]`);
    const resultEl = document.getElementById(`result-${id}`);
    
    const vals = {};
    inputs.forEach(inp => vals[inp.dataset.field] = parseFloat(inp.value) || 0);

    const v1 = vals[kpi.inputs[0].name];
    const v2 = vals[kpi.inputs[1].name];
    
    let result = '-';
    let numResult = 0;

    if (!v2 || v2 === 0) {
        result = '-';
    } else {
        if (kpi.formula === 'rate_200k') {
            numResult = (v1 * 200000) / v2;
            result = numResult.toFixed(3);
        } else if (kpi.formula === 'rate_1m') {
            numResult = (v1 * 1000000) / v2;
            result = numResult.toFixed(3);
        } else if (kpi.formula === 'percentage') {
            numResult = (v1 / v2) * 100;
            result = numResult.toFixed(1) + '%';
        }
    }

    resultEl.innerText = result;
    
    // Color Logic
    resultEl.classList.remove('text-good', 'text-bad', 'text-neutral');
    if (result === '-') {
        resultEl.classList.add('text-neutral');
    } else {
        let isGood = false;
        if (kpi.targetType === 'max') isGood = numResult <= kpi.targetVal;
        if (kpi.targetType === 'min') isGood = numResult >= kpi.targetVal;
        
        resultEl.classList.add(isGood ? 'text-good' : 'text-bad');
    }
}

// 🆕 Tool Switching Logic
function switchTool(toolName) {
    const btns = document.querySelectorAll('.tool-toggle-btn');
    const kpiSection = document.getElementById('kpiSection');
    const heatSection = document.getElementById('heatStressSection');
    const windSection = document.getElementById('windSpeedSection');

    btns.forEach(btn => {
        if(btn.dataset.tool === toolName) {
            btn.classList.add('active-tool');
        } else {
            btn.classList.remove('active-tool');
        }
    });

    // Hide all first
    kpiSection.style.display = 'none';
    heatSection.style.display = 'none';
    windSection.style.display = 'none';

    if (toolName === 'kpi') {
        kpiSection.style.display = 'block';
    } else if (toolName === 'heat') {
        heatSection.style.display = 'block';
    } else if (toolName === 'wind') {
        windSection.style.display = 'block';
    }
}

// 🆕 Heat Stress Calculation Logic
function calculateHeatIndex() {
    const tInput = document.getElementById('inputTemp').value;
    const hInput = document.getElementById('inputHumidity').value;
    const resultCard = document.getElementById('heatIndexResultCard');
    const valueEl = document.getElementById('heatIndexValue');
    const riskEl = document.getElementById('heatRiskLevel');
    const listEl = document.getElementById('heatRecommendationsList');

    if (!tInput || !hInput) {
        resultCard.style.display = 'none';
        return;
    }

    const T = parseFloat(tInput);
    const RH = parseFloat(hInput);

    // Convert C to F for calculation (standard NOAA formula uses F)
    const T_F = (T * 9/5) + 32;
    
    // Simple Heat Index Formula (Rothfusz regression)
    let HI_F = 0.5 * (T_F + 61.0 + ((T_F-68.0)*1.2) + (RH*0.094));

    if (HI_F >= 80) {
        HI_F = -42.379 + 2.04901523*T_F + 10.14333127*RH - 0.22475541*T_F*RH - 0.00683783*T_F*T_F - 0.05481717*RH*RH + 0.00122874*T_F*T_F*RH + 0.00085282*T_F*RH*RH - 0.00000199*T_F*T_F*RH*RH;
    }

    // Convert back to C
    const HI_C = (HI_F - 32) * 5/9;
    const displayVal = HI_C.toFixed(1) + '°C';
    
    valueEl.innerText = displayVal;
    resultCard.style.display = 'block';

    // Categorization & Colors
    let riskLevel = "";
    let color = "";
    let recs = "";

    if (HI_C < 27) {
        riskLevel = "LOW RISK (Safe)";
        color = "#27ae60"; // Green
        recs = "<li>Hydration: Drink water when thirsty.</li><li>Activity: Normal work activity allowed.</li>";
    } else if (HI_C >= 27 && HI_C < 32) {
        riskLevel = "CAUTION";
        color = "#f1c40f"; // Yellow
        resultCard.style.color = "#333"; // Dark text for yellow bg
        recs = "<li>Hydration: Drink water freely (Min 1 cup / 20 min).</li><li>Activity: Monitor for fatigue.</li>";
    } else if (HI_C >= 32 && HI_C < 41) {
        riskLevel = "EXTREME CAUTION";
        color = "#e67e22"; // Orange
        resultCard.style.color = "white";
        recs = "<li>Hydration: 1 cup (250ml) every 15-20 mins.</li><li>Rest: Rest in shade if feeling strain.</li><li>Monitoring: Watch for heat cramps.</li>";
    } else if (HI_C >= 41 && HI_C < 54) {
        riskLevel = "DANGER";
        color = "#c0392b"; // Red
        resultCard.style.color = "white";
        recs = "<li>Hydration: Strictly enforce 1 cup every 10-15 mins.</li><li>Work: Reschedule strenuous work to cooler times.</li><li>Monitoring: Check workers for heat exhaustion.</li>";
    } else {
        riskLevel = "EXTREME DANGER";
        color = "#2c3e50"; // Dark/Black
        resultCard.style.color = "white";
        recs = "<li>ACTION: STOP all non-essential work.</li><li>Risk: High risk of Heat Stroke.</li><li>Emergency: Implement emergency protocols immediately.</li>";
    }

    resultCard.style.backgroundColor = color;
    riskEl.innerText = riskLevel;
    listEl.innerHTML = recs;
}

// 🆕 NEW: Wind Speed Safety Logic
function calculateWindSafety() {
    const wInput = document.getElementById('inputWind').value;
    const resultCard = document.getElementById('windSpeedResultCard');
    const valueEl = document.getElementById('windValue');
    const riskEl = document.getElementById('windRiskLevel');
    const listEl = document.getElementById('windRecommendationsList');

    if (!wInput) {
        resultCard.style.display = 'none';
        return;
    }

    const windSpeed = parseFloat(wInput);
    valueEl.innerText = windSpeed.toFixed(1) + ' km/h';
    resultCard.style.display = 'block';

    let riskLevel = "";
    let color = "";
    let recs = "";

    if (windSpeed < 20) {
        riskLevel = "SAFE";
        color = "#27ae60"; // Green
        recs = "<li>Safe for most operations.</li><li>Monitor changes.</li>";
    } else if (windSpeed >= 20 && windSpeed <= 25) {
        riskLevel = "CAUTION";
        color = "#f1c40f"; // Yellow
        resultCard.style.color = "#333"; 
        recs = "<li>Approaching limit for Manbaskets.</li><li>Secure loose materials.</li>";
    } else if (windSpeed > 25 && windSpeed <= 32) {
        riskLevel = "RESTRICTED";
        color = "#e67e22"; // Orange
        resultCard.style.color = "white"; 
        recs = "<li><b>STOP:</b> Manbasket (Personnel Platform) operations prohibited (>25 km/h). (CSM II-1.4.3.4)</li><li>Crane lifting permitted with caution.</li>";
    } else if (windSpeed > 32) {
        riskLevel = "DANGER - STOP LIFTING";
        color = "#c0392b"; // Red
        resultCard.style.color = "white"; 
        recs = "<li><b>STOP:</b> All Crane Lifting Operations prohibited (>32 km/h). (CSM II-1.3.1)</li><li><b>STOP:</b> Manbasket operations.</li><li>Secure cranes as per manufacturer.</li>";
    } 
    
    // General high wind for scaffolding (often cited >50-65km/h but good to warn early)
    if (windSpeed > 50) {
        recs += "<li><b>STOP:</b> Work at height / Scaffolding.</li>";
        riskLevel = "HIGH DANGER";
    }

    resultCard.style.backgroundColor = color;
    riskEl.innerText = riskLevel;
    listEl.innerHTML = recs;
}

// 🆕 NEW: GPS Location Function
function getGPSLocation() {
    const resultDiv = document.getElementById('locationResult');
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
    
    if (!navigator.geolocation) {
        resultDiv.innerHTML = "Geolocation is not supported by your browser.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const long = position.coords.longitude.toFixed(6);
            const mapLink = `https://www.google.com/maps?q=${lat},${long}`;
            
            resultDiv.innerHTML = `
                <div style="background:var(--accent-light); padding:10px; border-radius:5px; margin-top:5px;">
                    <strong>Lat:</strong> ${lat} <br>
                    <strong>Long:</strong> ${long} <br>
                    <a href="${mapLink}" target="_blank" style="color:var(--primary-color); font-weight:bold;">
                        <i class="fas fa-map-marked-alt"></i> Open in Google Maps
                    </a>
                </div>
            `;
        },
        (error) => {
            resultDiv.innerHTML = `Unable to retrieve location. Error: ${error.message}`;
        }
    );
}


// 🛑 دالة فتح التابات (لم تتغير)
function openTab(evt, tabName) {
    var tabcontent = document.getElementsByClassName("tab-content");
    var navbuttons = document.getElementsByClassName("nav-button");
    var targetButton = evt.currentTarget || document.querySelector(`.nav-button[onclick*="'${tabName}'"]`);
    var targetColor = targetButton ? targetButton.getAttribute('data-color') : null;
    
    // Hide the floating button for all tabs EXCEPT FormTab (though we removed FormTab, it's safer to keep this logic)
    // The button should be visible all the time in the new design. It's safe to keep it visible.
    // document.getElementById('addObservationButton').style.display = (tabName === 'FormTab' ? 'none' : 'block');

    for (var i = 0; i < tabcontent.length; i++) tabcontent[i].classList.remove('active');
    
    for (var i = 0; i < navbuttons.length; i++) {
        navbuttons[i].classList.remove("active");
        navbuttons[i].style.color = ''; 
    }
    
    var currentTab = document.getElementById(tabName);
    currentTab.classList.add('active');

    if (targetButton) {
        targetButton.classList.add("active");
        if (targetColor) {
            targetButton.style.color = targetColor;
        }
    }
}

function showLeaderboardModal() {
    const modal = document.getElementById('leaderboardModal');
    const container = document.getElementById('leaderboardContainer');

    if (leaderboardData.length === 0 || container.innerHTML.includes('fa-spinner')) {
        container.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading leaderboard...</div>`;
    }

    if (leaderboardData.length === 0) {
        fetchEOMData(true); 
    } else {
         renderLeaderboard();
    }

    modal.style.display = 'block';
}
       
function renderLeaderboard() {
     const container = document.getElementById('leaderboardContainer');
     const sortedData = [...leaderboardData].sort((a, b) => b.points - a.points);
     // ... (HTML table generation code remains the same)
     let tableHTML = '<table id="leaderboardTable"><thead><tr><th>Rank</th><th>Safety Officer Name</th><th>Points</th></tr></thead><tbody>';

    sortedData.forEach((item, index) => {
        tableHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.points}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

function hideLeaderboardModal() {
    document.getElementById('leaderboardModal').style.display = 'none';
}

function showEmergencyContactsModal() {
    const modal = document.getElementById('emergencyContactsModal');
    modal.style.display = 'block';
}

function hideEmergencyContactsModal() {
    document.getElementById('emergencyContactsModal').style.display = 'none';
}

// 🟢 دالة إغلاق Modal تأكيد JSA الجديدة (تم الحفاظ عليها بالرغم من عدم استخدامها الآن)
function hideJSAConfirmationModal() {
    document.getElementById('jsaConfirmationModal').style.display = 'none';
}

// 🛑 الكود المصحح لإدارة ألوان الأكورديون (Accordion Click Handler)
document.addEventListener('click', function(e) {
    const accordion = e.target.closest('.accordion');
    
    if (accordion) {
        // إذا كان زر يفتح Modal (مثل Monthly Leaderboard و EMERGENCY CONTACTS)، لا نعالجه هنا
        if (accordion.onclick) return; 

        const isActive = accordion.classList.contains('activeAcc');
        const color = accordion.getAttribute('data-color');
        let panel = accordion.nextElementSibling;

        // 1. إعادة ضبط الألوان والحالة لجميع الأكورديونات غير الخاصة بالـ Modal وغير JSA
        document.querySelectorAll('.accordion').forEach(acc => {
            // نتحقق من فئة 'jsa-accordion-item' أيضاً لعدم تدخل أكورديون InfoTab مع JSA
            if (!acc.onclick && !acc.classList.contains('jsa-accordion-item')) { 
                 acc.classList.remove('activeAcc');
                 acc.style.backgroundColor = ''; 
                 acc.style.color = ''; 
                 // إزالة الـ inline style الخاص بـ border-color إذا كان موجوداً
                 if(acc.nextElementSibling && acc.nextElementSibling.classList.contains('panel')) {
                     acc.nextElementSibling.style.display = 'none';
                     acc.nextElementSibling.style.color = ''; 
                 }
            }
        });
        
        // 2. تفعيل الأكورديون الحالي وتطبيق الألوان
        if (!isActive && !accordion.classList.contains('jsa-accordion-item')) {
            accordion.classList.add('activeAcc');
            
            // تطبيق اللون المخصص على زر الأكورديون
            if (color) {
                // نستخدم اللون المخصص كخلفية، ونقلب لون النص إلى أبيض
                accordion.style.backgroundColor = color;
                accordion.style.color = 'white'; 
            }
            
            if(panel && panel.classList.contains('panel')) {
                 panel.style.display = 'block';
                 // تطبيق اللون على Panel (لأجل border-left والنقاط)
                 if (color) {
                     panel.style.color = color;
                 }
            }
        } 
    }
});

function loadTBTOfTheDay() {
    const tbtPanel = document.getElementById('tbtPanel');
    const tbtAccordion = document.getElementById('tbtAccordion');
    const defaultIcon = "fas fa-book-open"; // أيقونة افتراضية للـ TBT
    
    if (!tbtPanel || !tbtAccordion || tbtData.length === 0) return;
    
    // حساب مؤشر TBT لهذا اليوم بناءً على رقم اليوم في السنة
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // استخدام معامل القسمة للتكرار على قائمة TBTs
    const index = dayOfYear % tbtData.length;
    const tbt = tbtData[index]; // الآن tbt تحتوي على { title, link }
    
    // تحديد اللون الأساسي للـ TBT Panel والـ link
    const linkColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
    
    
    // 1. تحديث عنوان الأكورديون والرمز
    tbtAccordion.innerHTML = `<i class="${defaultIcon}"></i> ${tbt.title}`;
    
    // 2. بناء محتوى اللوحة (Panel) مع الرابط المطلوب
    tbtPanel.innerHTML = `
        <p style="margin-top:0; color:var(--text-muted); font-size:14px;">Tap the link below to open the daily documenfoodt.</p>
        <a href="${tbt.link}" target="_blank" style="color:${linkColor}; font-weight:bold; text-decoration:none; display:block; margin-top:10px; font-size:15px;">
            🔗 Open: ${tbt.title}
        </a>
    `;
    
    // لضمان أن لون الـ border-left الخاص بالـ panel يتطابق مع الـ primary-color
    tbtPanel.style.color = linkColor;
}

(function setMonthColor() {
    const cycle = ['Red','Blue','Yellow','Green'];
    const startIndexMonth = 9;
    const m = new Date().getMonth();
    const offset = ((m - startIndexMonth) % 4 + 4) % 4;
    const color = cycle[offset];
    const colorNameEl = document.getElementById('colorName');
    if (colorNameEl) {
        colorNameEl.textContent = color;
        colorNameEl.style.color = color.toLowerCase();
    }
})();

function fetchEOMData(forceRender = false) {
    fetch(eomSheetUrl)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.text();
        })
        .then(csvText => {
            const rows = csvText.split('\n').slice(1);
            leaderboardData = []; 
            let maxPoints = -1;
            let topEmployee = '';

            rows.forEach(row => {
                if(row.trim() === '') return;
                const cols = row.split(',').map(col => col.replace(/["']/g,'').trim());

                const name = cols[0];
                const points = parseFloat(cols[1]);

                if(!isNaN(points) && name.trim() !== '') {
                    leaderboardData.push({ name: name, points: points });

                    if(points > maxPoints){
                        maxPoints = points;
                        topEmployee = name.trim();
                    }
                }
            });

            const el = document.getElementById('employeeOfMonth');
            if(el) el.textContent = topEmployee || 'No data (Check sheet data)';

            if (forceRender || document.getElementById('leaderboardModal').style.display === 'block') {
                 renderLeaderboard();
            }
        })
        .catch(err => {
            const el = document.getElementById('employeeOfMonth');
            if(el) el.textContent = 'Error loading data (Link Check)';

            const leaderboardContainer = document.getElementById('leaderboardContainer');
            if(leaderboardContainer) leaderboardContainer.innerHTML = `<p style='text-align:center; color: var(--danger-color);'>Failed to load leaderboard data.</p>`;

            console.error('Error fetching Employee of the Month:', err);
        });
}

// 🟢 التعديل الثالث: تعديل دالة JSA List لإنشاء أكورديون داخلي
function renderJSAList(data) {
    const container = document.getElementById('jsaListContainer');
    container.innerHTML = ''; // Clear existing list
    const jsaColor = getComputedStyle(document.documentElement).getPropertyValue('--jsa-color');

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center; color: var(--text-muted); margin-top:20px;">No matching JSA found.</p>`;
        return;
    }

    data.forEach(item => {
        // 1. إنشاء زر الأكورديون (الرأس)
        const button = document.createElement('button');
        // نستخدم 'accordion' ولكن بفئة 'jsa-accordion-item' لتمييزه
        button.className = 'accordion jsa-accordion-item'; 
        button.setAttribute('data-color', jsaColor);
        // نستخدم <i> عادية هنا لتطبق عليها أنماط .jsa-accordion-item i 
        button.innerHTML = `<i class="fas fa-file-pdf"></i> ${item.title}`; 
        
        // 2. إنشاء محتوى الأكورديون (الـ panel)
        const panel = document.createElement('div');
        // نستخدم 'panel' ولكن بفئة 'jsa-panel' لتمييزه
        panel.className = 'panel jsa-panel'; 
        
        // 3. بناء الرابط داخل قائمة داخل الـ panel
        panel.innerHTML = `
            <ul>
                <li>
                    <a href="${item.link}" target="_blank" style="color:${jsaColor}; font-weight:bold; text-decoration:none;">
                        🔗 Open JSA Document (${item.title})
                    </a>
                </li>
            </ul>
        `;
        
        container.appendChild(button);
        container.appendChild(panel);

        // 4. إضافة معالج الحدث (Event Listener) لتشغيل وظيفة الأكورديون
        button.addEventListener('click', function() {
            // نستخدم نفس منطق الأكورديون ولكن نحدده على فئة jsa-accordion-item فقط
            const isActive = this.classList.contains('activeAcc');
            
            // إعادة ضبط الألوان والحالة لجميع الأكورديونات JSA غير النشطة
            document.querySelectorAll('.jsa-accordion-item').forEach(acc => {
                 if (acc !== this) {
                     acc.classList.remove('activeAcc');
                     acc.style.backgroundColor = ''; 
                     acc.style.color = ''; 
                     if(acc.nextElementSibling && acc.nextElementSibling.classList.contains('jsa-panel')) {
                         acc.nextElementSibling.style.display = 'none';
                     }
                 }
            });

            // تفعيل أو إلغاء تفعيل العنصر الحالي
            if (!isActive) {
                this.classList.add('activeAcc');
                this.style.backgroundColor = jsaColor;
                this.style.color = 'white';
                panel.style.display = 'block';
                panel.style.color = jsaColor; // لضبط لون الخط الجانبي والنقاط
            } else {
                this.classList.remove('activeAcc');
                this.style.backgroundColor = '';
                this.style.color = '';
                panel.style.display = 'none';
            }
        });
    });
}

function filterJSAList() {
    const searchTerm = document.getElementById('jsaSearch').value.toLowerCase().trim();
    if (!searchTerm) {
        renderJSAList(jsaData); // Show all if no search term
        return;
    }

    const filteredData = jsaData.filter(jsa => 
        jsa.title.toLowerCase().includes(searchTerm)
    );

    renderJSAList(filteredData);
}

// 🆕 دالة تبديل الوضع (Dark/Light Mode)
function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = body.classList.toggle('dark-mode');
    const modeIcon = document.getElementById('modeIcon');
    
    // تحديث الأيقونة والنص
    if (modeIcon) {
        modeIcon.classList.remove(isDarkMode ? 'fa-sun' : 'fa-moon');
        modeIcon.classList.add(isDarkMode ? 'fa-moon' : 'fa-sun');
    }
    
    // حفظ التفضيل (اختياري، لكن يوصى به)
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // لإعادة تطبيق الألوان على العناصر التي تستخدم inline style أو ترث من body/root
    renderJSAList(jsaData); // إعادة رسم قائمة JSA لضبط ألوانها
    loadTBTOfTheDay(); // إعادة تحميل TBT لضبط لونه
}


document.addEventListener('DOMContentLoaded', () => {
    // 🆕 تطبيق التفضيل المحفوظ عند التحميل
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const modeIcon = document.getElementById('modeIcon');
        if (modeIcon) {
             modeIcon.classList.remove('fa-sun');
             modeIcon.classList.add('fa-moon');
        }
    } else {
         const modeIcon = document.getElementById('modeIcon');
         if (modeIcon) {
             modeIcon.classList.add('fa-sun'); // Default icon for Light Mode
         }
    }

    // 🛑 تطبيق اللون المخصص للزر النشط افتراضيًا عند تحميل الصفحة
    const infoButton = document.querySelector('.nav-button[onclick*="InfoTab"]');
    if(infoButton) {
        document.getElementById('InfoTab').classList.add('active');
        infoButton.classList.add('active');
        const defaultColor = infoButton.getAttribute('data-color');
        if (defaultColor) {
            infoButton.style.color = defaultColor;
        }
    }


    const eomCard = document.getElementById('eomCard');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const emergencyModal = document.getElementById('emergencyContactsModal');
    const jsaConfirmationModal = document.getElementById('jsaConfirmationModal');


    if (eomCard) eomCard.addEventListener('click', showLeaderboardModal);

    window.addEventListener('click', (event) => {
         // 🟢 إضافة Modal تأكيد JSA لآلية الإغلاق
         if (event.target == leaderboardModal) hideLeaderboardModal();
         if (event.target == emergencyModal) hideEmergencyContactsModal();
         if (event.target == jsaConfirmationModal) hideJSAConfirmationModal();
    });
    
    // 🟢 إضافة معالج حدث لزر التأكيد داخل Modal الـ JSA (تم إبقاؤه لكنه لن يُستخدم الآن)
    document.getElementById('driveLinkConfirm').addEventListener('click', () => {
        // نغلق الـ modal بعد الضغط على الرابط (لأنه سيفتح في نافذة جديدة)
        hideJSAConfirmationModal();
    });


    // Set the current Month and Year
    const now = new Date();
    const options = { month: 'long', year: 'numeric' };
    const currentMonthYear = now.toLocaleDateString('en-US', options);
    const cardTitleElement = document.getElementById('eomCardTitle');
    if (cardTitleElement) {
        cardTitleElement.innerHTML = `<i class="fas fa-trophy" style="color: #FFD700;"></i> Employee of the Month (${currentMonthYear})`;
    }

    // --- Employee of the Month/Leaderboard Data Fetch ---
    fetchEOMData();
    loadTBTOfTheDay();
    // --- JSA Tab Initialization ---
    renderJSAList(jsaData);
    document.getElementById('jsaSearch').addEventListener('input', filterJSAList);
    // --- KPI Initialization ---
    renderKPIs();


    // --- Load News from Google Sheet (Code remains the same) ---
    const newsSheetUrl = 'https://docs.google.com/spreadsheets/d/1_SwxL5f4mWF5kd2yofCMCEE_WQp_2eroHDhXXPXtw1U/export?format=csv&gid=0';
    fetch(newsSheetUrl)
        .then(res => res.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1);
            const container = document.getElementById('AnnouncementsContainer');
            container.innerHTML = ''; 

            rows.forEach(row => {
                if(row.trim() === '') return;

                const parts = row.match(/(".*?"|[^,]+)/g) || [];
                const [date, title, content] = parts.map(p => p.trim().replace(/^"|"$/g, ''));

                const card = document.createElement('div');
                card.className = 'announcement-card';

                const isContentEmpty = !content || content === 'NULL';
                const cursorStyle = isContentEmpty ? 'default' : 'pointer';

                card.innerHTML = `
                    <div class="card-date">${date || ''}</div>
                    <div class="card-title" style="cursor: ${cursorStyle};">
                        ${title || 'No Title'}
                        ${!isContentEmpty ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
                    </div>
                    <div class="card-content">${content || 'No detailed content available.'}</div>
                `;
                container.appendChild(card);

                if (!isContentEmpty) {
                    const titleDiv = card.querySelector('.card-title');
                    const contentDiv = card.querySelector('.card-content');

                    titleDiv.addEventListener('click', () => {
                        const isOpen = contentDiv.style.display === 'block';
                        contentDiv.style.display = isOpen ? 'none' : 'block';
                        titleDiv.classList.toggle('open', !isOpen);
                    });
                }
            });
        })
        .catch(err => {
            const container = document.getElementById('AnnouncementsContainer');
            container.innerHTML = `<div class="announcement-card">
                                     <div class="card-date">Error</div>
                                     <div class="card-title" style="cursor:default;">Failed to fetch news</div>
                                     <div class="card-content" style="display:block; color: var(--danger-color);">Check the link or network connection.</div>
                                   </div>`;
            console.error('Error loading news:', err);
        });
});
