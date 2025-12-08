(function() {
  const API = '/api';
  let currentUser = null;
  let authToken = localStorage.getItem('authToken');

  const state = {
    obsRange: 'month',
    obsArea: '',
    obsStatus: '',
    obsSearch: '',
    permitsRange: 'today',
    permitsArea: '',
    permitsType: '',
    permitsSearch: '',
    eqArea: '',
    eqStatus: '',
    eqSearch: '',
    tbtRange: 'today',
    tbtSearch: ''
  };

  const $ = s => document.querySelector(s);
  const $all = s => Array.from(document.querySelectorAll(s));

  function extractDriveInfo(url) {
    if (!url) return null;
    let fileId = null;
    let resourceKey = null;
    
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) fileId = fileMatch[1];
    else if (url.includes('drive.google.com') && url.includes('id=')) {
      const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) fileId = idMatch[1];
    }
    
    const rkMatch = url.match(/resourcekey=([a-zA-Z0-9_-]+)/);
    if (rkMatch && rkMatch[1]) resourceKey = rkMatch[1];
    
    return fileId ? { fileId, resourceKey } : null;
  }

  function convertDriveUrl(url) {
    if (!url) return url;
    const info = extractDriveInfo(url);
    if (info) {
      let newUrl = `https://drive.google.com/thumbnail?id=${info.fileId}&sz=w1000`;
      if (info.resourceKey) newUrl += `&resourcekey=${info.resourceKey}`;
      return newUrl;
    }
    return url;
  }

  function handleImageError(img) {
    const originalUrl = img.getAttribute('data-original-url') || img.dataset.originalUrl || img.src;
    const info = extractDriveInfo(originalUrl);
    if (info && !img.dataset.retried) {
      img.dataset.retried = 'true';
      let fallbackUrl = `https://drive.google.com/uc?export=view&id=${info.fileId}`;
      if (info.resourceKey) fallbackUrl += `&resourcekey=${info.resourceKey}`;
      img.src = fallbackUrl;
      return;
    }
    img.onerror = null;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="55" font-family="Arial" font-size="12" fill="%23999" text-anchor="middle">Image unavailable</text></svg>';
    img.style.opacity = '0.6';
  }
  window.handleImageError = handleImageError;

  function openImageViewer(url) {
    const viewerModal = document.getElementById('imageViewerModal');
    const viewerImg = document.getElementById('imageViewerImg');
    if (viewerModal && viewerImg) {
      viewerImg.dataset.originalUrl = url;
      viewerImg.dataset.retried = '';
      viewerImg.onerror = function() { handleImageError(this); };
      viewerImg.src = convertDriveUrl(url);
      viewerModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeImageViewer() {
    const viewerModal = document.getElementById('imageViewerModal');
    if (viewerModal) {
      viewerModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  window.openImageViewer = openImageViewer;
  window.closeImageViewer = closeImageViewer;

  const MONTH_COLORS = {0:'Green',1:'Red',2:'Blue',3:'Yellow',4:'Green',5:'Red',6:'Blue',7:'Yellow',8:'Green',9:'Red',10:'Blue',11:'Yellow'};
  const TBT_DATA = [
    { title: "Alcohol and Drugs", link: "https://drive.google.com/file/d/1uIGAjyY2UuxdkWToEGqMoF-L1Q9cIn5c/view?usp=drivesdk" },
    { title: "Biohazard infection materials", link: "https://drive.google.com/file/d/1wUY8mlaEXOroUK5IoPPbBpym97Jdjfm4/view?usp=drivesdk" },
    { title: "Cold Weather", link: "https://drive.google.com/file/d/1QOp3TVAb-si19p-taHpPjSwEfXs1O5us/view?usp=drivesdk" },
    { title: "Compressed Gas", link: "https://drive.google.com/file/d/1a7tLsOI7Re7QAWDivisUFdakbvpSEYOt/view?usp=drivesdk" },
    { title: "Confined Space", link: "https://drive.google.com/file/d/1HXssVREKX0mq0Orn-gU3oqaLfDgEY2j1/view?usp=drivesdk" },
    { title: "Construction Fires", link: "https://drive.google.com/file/d/1nXBiIuAEjs4om2NwASqfyhtT-8IUBpGt/view?usp=drivesdk" },
    { title: "Corrosive Materials", link: "https://drive.google.com/file/d/1VaFxPYhYt0Ho8blbkGQi2S4ubsT882ge/view?usp=drivesdk" },
    { title: "Dangerously reactive material", link: "https://drive.google.com/file/d/16CNFN5iuf3YFyVW-tYNVQgHkRu8z8deg/view?usp=drivesdk" },
    { title: "Dial before you Dig", link: "https://drive.google.com/file/d/1YlWyaHh2lPoum-OYYoJ2qP8t948qwZLI/view?usp=drivesdk" },
    { title: "Driving in Reverse", link: "https://drive.google.com/file/d/1QzLSWz3CFfjGdmj62OsFdvT5IcV_lrqJ/view?usp=drivesdk" },
    { title: " Emergency Response", link: "https://drive.google.com/file/d/1bWiXimPy6SmqbtEs5LxJE9zvS765GSzN/view?usp=drivesdk" },
    { title: " Equipment Guards", link: "https://drive.google.com/file/d/1i4o3HHM6O2EPJ1hf-2IQ97_AREDCMIDr/view?usp=drivesdk" },
    { title: " Exercise and Health", link: "https://drive.google.com/file/d/13pnUXqSmGNuXHAGKG7TyKhwryEWbtAaO/view?usp=drivesdk" },
    { title: " Eye Protection", link: "https://drive.google.com/file/d/13HufH-DcwH-P-pEZZKTUNzHSo2lzyzLa/view?usp=drivesdk" },
    { title: " Fall Protection", link: "https://drive.google.com/file/d/1I_MQHppz0KnwIgiTiLwpLUPyd0N-z1c_/view?usp=drivesdk" },
    { title: " Fatigue", link: "https://drive.google.com/file/d/1jidO7NprdqLowWkXEXKtWBPBq5iwI9yA/view?usp=drivesdk" },
    { title: " Flammable and Combustible Materials", link: "https://drive.google.com/file/d/1Gcbe3miY43cJYkW6a7sTO7mbC8m31ICL/view?usp=drivesdk" },
    { title: " Foot Protection", link: "https://drive.google.com/file/d/1aQJxutEcqL2H_mcnSBK9uuj2silzAyRl/view?usp=drivesdk" },
    { title: " Grinders Naloxia", link: "https://drive.google.com/file/d/1jJqncsuUSmrF2dPlqlLz28jRN73H-RBe/view?usp=drivesdk" },
    { title: " Hand Protection", link: "https://drive.google.com/file/d/1LOiKyFoMb3dsR_pYyJECJLxCMFpEhpFT/view?usp=drivesdk" },
    { title: " Hazardouse Waste", link: "https://drive.google.com/file/d/1pLR9ewUgc0Memjx3BLiOnSW-4MWf7IKe/view?usp=drivesdk" },
    { title: " Head Protection", link: "https://drive.google.com/file/d/1BlmB3NNKNldC0xMH-c_j-KqlmDva_loF/view?usp=drivesdk" },
    { title: " Hearing", link: "https://drive.google.com/file/d/191qRYe-ZVNfcSGHBtm6TLK4rVAOFtKTh/view?usp=drivesdk" },
    { title: " Hot Weather", link: "https://drive.google.com/file/d/1to9Fzdpv5bu3GQm98prLzFSjpuHAmuUh/view?usp=drivesdk" },
    { title: " Housekeeping", link: "https://drive.google.com/file/d/1iTMdIu08H0H-0S03mxMrlawHSWhjEf-c/view?usp=drivesdk" },
    { title: " Inspection of tools", link: "https://drive.google.com/file/d/1kNXJxumw42uQe1eGdBLZ-KlKEoI_ctF6/view?usp=drivesdk" },
    { title: "Ladder Safety", link: "https://drive.google.com/file/d/1KO_-SERnB-IE68KL-cmxxG6dVkFVERUq/view?usp=drivesdk" },
    { title: " Lock out", link: "https://drive.google.com/file/d/1AhXs6ej3cDXk5gAIQAt09ySwAtZV7dn8/view?usp=drivesdk" },
    { title: " Material Safety Data Sheet", link: "https://drive.google.com/file/d/1hpf53QlwxLDp0VZC6F5TBZ1NTZuId6Gp/view?usp=drivesdk" },
    { title: " Oxidizing Materials", link: "https://drive.google.com/file/d/10dBlB83VwTiGtbN5RteXckS7rbmUaekS/view?usp=drivesdk" },
    { title: " Personal Protectuve Equipment", link: "https://drive.google.com/file/d/1IfAiA0mVIrLEGIxip-YhrhFyLhGCC0Yk/view?usp=drivesdk" },
    { title: " Pinch Points and Blinds", link: "https://drive.google.com/file/d/1fFNrba9aIgQxXcbiaLnjb5FqHsKTGjPG/view?usp=drivesdk" },
    { title: " Poisonous and Infectious Materials", link: "https://drive.google.com/file/d/1g1hsd8OIgPt6njOeSNozajuAiVJNKMlX/view?usp=drivesdk" },
    { title: " Power Lines", link: "https://drive.google.com/file/d/1Sqlm3-z9cZ6RaOFqVPL-A4sZ1pnxDxLD/view?usp=drivesdk" },
    { title: " Power Saws", link: "https://drive.google.com/file/d/1WiTJbh7uaGCTwzUHo5EUMa6vYl-hzMBj/view?usp=drivesdk" },
    { title: " Proper Lifting and Back Care", link: "https://drive.google.com/file/d/10EutgMs_0XH_VJvF2_vIYcQRIlPQtN_4/view?usp=drivesdk" },
    { title: " Reporting Accedints", link: "https://drive.google.com/file/d/1AoADCkqOQxoWMIkQkNa2S71FzZzra4s6/view?usp=drivesdk" },
    { title: " Reporting Near Miss and incident ", link: "https://drive.google.com/file/d/1W5yhuJrbdaO27S2B-TnPbTVVKkCSnIFG/view?usp=drivesdk" },
    { title: " Respiratory Protective", link: "https://drive.google.com/file/d/1QX86Iu4RJj5bvdzWdJgtKAy8-LIRR8x7/view?usp=drivesdk" },
    { title: " Roofing", link: "https://drive.google.com/file/d/17INX1mFhwxHsxyM8A6Vbd98jywHDFN08/view?usp=drivesdk" },
    { title: " Scaffold Safety", link: "https://drive.google.com/file/d/1BPzGrFJMuA9eDl46zhh7iQqMYqqnMwLS/view?usp=drivesdk" },
    { title: " Signs", link: "https://drive.google.com/file/d/1RfT2WDhQnOW_8FTv2t80UfhXO14uEmxJ/view?usp=drivesdk" },
    { title: " Slips and Trips", link: "https://drive.google.com/file/d/11QSqSs0SWcXHjzNQMrjDtumrKtM5Wp0u/view?usp=drivesdk" },
    { title: " Stretching", link: "https://drive.google.com/file/d/1dD54piQQtbjhhw3u_4bCLSfjp9cd5Jtr/view?usp=drivesdk" },
    { title: " Traffic Control People", link: "https://drive.google.com/file/d/1aLbvfU2E4OpsYv4UkjTa4Y6QEupxDwPI/view?usp=drivesdk" },
    { title: " Transportion of Goods", link: "https://drive.google.com/file/d/1rbuTSg_MTsr_gwxGNWAyyPeBvZpNOGHL/view?usp=drivesdk" },
    { title: " Safe Trenching and Excavating", link: "https://drive.google.com/file/d/1CKOVtAR5iGz0PVQz51adhC6ZXjtEJgV_/view?usp=drivesdk" },
    { title: " Working Around Mobile Equipment", link: "https://drive.google.com/file/d/14SncgzRAVHd8-kJNGmZVroYuS42TshEr/view?usp=drivesdk" },
    { title: " Working With Hazardous Materials ", link: "https://drive.google.com/file/d/1gYF6cUISYjUZF_pLEKadmPbe49YM2_ph/view?usp=drivesdk" },
  ];
  const JSA_DATA = [
    {title:"JSA - Welding Operations",link:"https://drive.google.com/file/d/jsa1"},
    {title:"JSA - Scaffolding Erection",link:"https://drive.google.com/file/d/jsa2"},
    {title:"JSA - Excavation Work",link:"https://drive.google.com/file/d/jsa3"}
  ];
  const CSM_DATA = [
    { title: "CSM - index - الفهرس", link: "https://drive.google.com/file/d/1EUTfno4FZtL0uyrCr28KY5vAR--h8QuZ/view?usp=drivesdk" },
    { title: "CSM - Contractor Safety Administrative Requirements", link: "https://drive.google.com/file/d/14P2Yjmp2w54R2m1yOAOVKjv1auRpMmND/view?usp=drive_link" },
    { title: "CSM I-1 Emergency Reporting and Response", link: "https://drive.google.com/file/d/1z8karx9RyNKORpVE7UJkDwVus4vz2UPf/view?usp=drive_link" },
    { title: "CSM I-2 Incident Reporting and Investigation", link: "https://drive.google.com/file/d/1KwbXosNd5DwpLZ8MYWb8UUuEdWeh7NfX/view?usp=drive_link" },
    { title: "CSM I-3 Personal Protective Equipment (PPE)", link: "https://drive.google.com/file/d/152cfH1EqdIrk5_V9pcwzj8djl3O6-yJJ/view?usp=drive_link" },
    { title: "CSM I-4 Work Permit System and Stop Work Authority", link: "https://drive.google.com/file/d/1Qz8e2vnXC58XxUKJxSaqG2s-jza3sSz3/view?usp=drive_link" },
    { title: "CSM 1-5 Isolation, Lockout and Use of Hold Tags", link: "https://drive.google.com/file/d/1J_klce7pdbNA3cvaiP7QIOZJJFEDazlx/view?usp=drive_link" },
    { title: "CSM I-6 Confined Spaces", link: "https://drive.google.com/file/d/1ggwNBBuMJRpXAggc_pGCRHJP3jPhdB5Y/view?usp=drive_link" },
    { title: "CSM I-7 Fire Prevention", link: "https://drive.google.com/file/d/1qlOm6lfqblv_gpH0EReezkEs6EYDoted/view?usp=drivesdk" },
    { title: "CSM I-8 Traffic and Vehicle Safety ", link: "https://drive.google.com/file/d/1PQ7sg8sQntHro3Zgs49bopnsBjHz3hBy/view?usp=drivesdk" },
    { title: "CSM I-9 Compressed Gas Cylinders", link: "https://drive.google.com/file/d/1nMbZr89lnGwXoQ4LysxRxri-LlFyWY9K/view?usp=drivesdk" }, 
    { title: "CSM I-10 Hazardous Materials", link: "https://drive.google.com/file/d/1VvcaqQrzivHC5KLRUn3nfFAGlfUZMj0F/view?usp=drivesdk" },
    { title: "CSM I-11 Hand Tools and Power Tools", link: "https://drive.google.com/file/d/1ZMS7gxHaKwPmDj3BXec6SYZ0Ljcy0Ggk/view?usp=drivesdk" },
    { title: "CSM I-12 Materials Handling", link: "https://drive.google.com/file/d/1IpbgrGR0N5K4UBfszVkdtzX00jbZQ6oJ/view?usp=drivesdk" },
    { title: "CSM I-13 Heat Stress", link: "https://drive.google.com/file/d/1OaA5D8-BYsBL7ZReq96BfJ3_nYbgLaNv/view?usp=drivesdk" }, 
    { title: "CSM II-1 Excavations and Shoring", link: "https://drive.google.com/file/d/1imul0j3y9ONgLMSwWZ6aETE6xwvjK34L/view?usp=drivesdk" },
    { title: "CSM II-2 Scaffolding", link: "https://drive.google.com/file/d/1sMWbIwgPp4BO7yNUF-LxrSz1WmNGNeUS/view?usp=drivesdk" },
    { title: "CSM II-3 Ladders and Stepladders", link: "https://drive.google.com/file/d/1SLRwVCUUjJ6BYeDrMUsZnwHTgOt61ujl/view?usp=drivesdk" },
    { title: "CSM II-4 Temporary Walking & Working Surfaces", link: "https://drive.google.com/file/d/1IGR51m-92KQ-I0R3zLVxXbeS2nfmcKWH/view?usp=drivesdk" }, 
    { title: "CSM II-5 Fall Protection", link: "https://drive.google.com/file/d/1uQoZnTHT4VCJkm9SG3zVhW_2Rv-p8vp8/view?usp=drivesdk" },
    { title: "CSM II-6 Concrete Construction ", link: "https://drive.google.com/file/d/1xdtwzdkP4CXWPWL5m9gmz0w4-pzoqrsM/view?usp=drivesdk" },
    { title: "CSM II-7 Steel Erection", link: "https://drive.google.com/file/d/1X8dfslDfmJnYBztL7ZRaeWHz3qPBZ7gX/view?usp=drivesdk" },
    { title: "CSM II-8 Abrasive Blasting", link: "https://drive.google.com/file/d/1qLMljOlgR_EFvnlyWPXmCTt0dCKG4pb6/view?usp=drivesdk" }, 
    { title: "CSM II-9 Painting and Coating", link: "https://drive.google.com/file/d/1NMm17WJBC_7mcmX6GVtBIMToWIT_Hg9H/view?usp=drivesdk" },
    { title: "CSM II-10 Cutting, Welding and Brazing ", link: "https://drive.google.com/file/d/1Qj4-Xl5k76FqyeXUT2XdedLbvL7WJ7Rm/view?usp=drivesdk" },
    { title: "CSM II-11 Road works", link: "https://drive.google.com/file/d/1dbHE3rLRh195UzhfqToiWoqbBdmDAOUP/view?usp=drivesdk" },
    { title: "CSM II-12 Piling Operations and Cofferdams", link: "https://drive.google.com/file/d/1gjSHH7CuLIif6cg8AwA0Cy8yzpD2Nu9I/view?usp=drivesdk" }, 
    { title: "CSM II-13 Explosive Materials", link: "https://drive.google.com/file/d/14aSXwDr8GjK-1TBILalrIV53IXb1Z4lz/view?usp=drivesdk" },
    { title: "CSM II-14 Demolition", link: "https://drive.google.com/file/d/1m0Pk7RfNxftN81DMHIfo2Fu7p8bJu6KP/view?usp=drivesdk" },
    { title: "CSM II-15 Rope Access", link: "https://drive.google.com/file/d/1_C0l2UquZ4Nih_-WmWunQnXpDGAgrDKj/view?usp=drivesdk" },
    { title: "CSM III-1 Machine Guarding ", link: "https://drive.google.com/file/d/1kg9gsGgA6MVs7M515vAe5CEkDRiGm3I4/view?usp=drivesdk" }, 
    { title: "CSM III-2 Mechanical and Heavy Equipment", link: "https://drive.google.com/file/d/1W06lWO34CDskrHm5sfgGnbIuw6gBxnaY/view?usp=drivesdk" },
    { title: "CSM III-3 Electrical Equipment", link: "https://drive.google.com/file/d/1d2_KTb8KaKc7nZh24ZB-5MdBtWOY1ooE/view?usp=drivesdk" },
    { title: "CSM III-4 Pressure Testing", link: "https://drive.google.com/file/d/1MbAdlctVQuZK_WtaPjCPHY0M-BaBrh3r/view?usp=drivesdk" },
    { title: "CSM III-5 Ionizing Radiation", link: "https://drive.google.com/file/d/1j7wdxEhmf3-fjcbwB30cYmSWLs6TOBe6/view?usp=drivesdk" }, 
    { title: "CSM III-6 Non-Destructive Testing (NDT)", link: "https://drive.google.com/file/d/1bTf8WAI1ygyr9Cfvnwif33oEe1yWDE30/view?usp=drivesdk" },
    { title: "CSM III-7 Cranes and Lifting Equipment ", link: "https://drive.google.com/file/d/1jIqqCzc631vyFkDfsi5UYacax6tMFbsm/view?usp=drivesdk" },
    { title: "CSM III-8 Slings and Rigging Hardware", link: "https://drive.google.com/file/d/1WioaM8T9Do9KgzccJ0nXpUKkuWCfg9lR/view?usp=drivesdk" },
    { title: "CSM III-9 High Pressure Water Jetting", link: "https://drive.google.com/file/d/1zfqzW7SF_OROG6BZr2eUWCIcFjH-1pGq/view?usp=drivesdk" }, 
    { title: "CSM IV-1 Diving Operations", link: "https://drive.google.com/file/d/1duFN7U1Kv-i5_y9KPN2FiaVE-hStJHQM/view?usp=drivesdk" },
    { title: "CSM IV-2 Marine Operations ", link: "https://drive.google.com/file/d/1H2R-d02dA1vuBeQSMm9yGHYssb5Kbbkb/view?usp=drivesdk" },
    { title: "CSM IV-3 Drilling and Well Servicing", link: "https://drive.google.com/file/d/1pODZ0oZY5YzH8AURGBG7_ZKamjQIis-v/view?usp=drivesdk" },
    { title: "CSM IV-4 Aviation", link: "https://drive.google.com/file/d/1ZyOCVN7E4Rmf1k4DvJ4YkbdEO95XKxtQ/view?usp=drivesdk" },
    { title: "CSM X- Glossary of Terms", link: "https://drive.google.com/file/d/1LYNw-1mxakpk2a4-WGjKXM6w7nGMXm5K/view?usp=drivesdk" }, 
    { title: "CSM - WSSM Table of Contents ", link: "https://drive.google.com/file/d/14-WcTxSJTqawcvN7D0nmh0McBmqoy1W4/view?usp=drivesdk" },
    { title: "Full CSM Book", link: "https://drive.google.com/file/d/1JS1VQKXLHdOOFXpYcpRftM-kviBv-TYd/view?usp=drivesdk" }
  ];
  const WALKTHROUGH_DATA = [
    { title: "Hydro-test Area - Safety Walkthrough Report on 11/10/2025",
      link: "https://drive.google.com/file/d/1ncnvQj-ycV1HmELH_wPkYIHcLvb8_oyE/view?usp=drive_link" },
    { title: "GGM Fabrication Area - Safety Walkthrough Report on 11/17/2025",
      link: "https://drive.google.com/file/d/17HkZkEfUezXFESUXzA2PDnelo8QCowW4/view?usp=drive_link" }
  ];

  async function apiCall(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    try {
      const res = await fetch(`${API}${endpoint}`, { ...options, headers });
      if (res.status === 401) {
        logout();
        return null;
      }
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  }

  function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
    toast.style.cssText = `background:${bgColor};color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;animation:slideIn 0.3s ease;`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
    
    if (id === 'addObservationModal') {
      await loadObservationDropdowns();
    } else if (id === 'addPermitModal') {
      await loadPermitDropdowns();
    } else if (id === 'addEquipmentModal') {
      await loadEquipmentDropdowns();
    } else if (id === 'addTbtModal') {
      await loadTbtDropdowns();
    }
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
  }
  window.openModal = openModal;
  window.closeModal = closeModal;

  function openTab(evt, tabId) {
    $all('.tab-content').forEach(t => { t.classList.remove('active'); t.style.display = 'none'; });
    const target = document.getElementById(tabId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }
    $all('.nav-button').forEach(b => b.classList.remove('active'));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
    window.scrollTo({ top: 0 });
  }
  window.openTab = openTab;

  function toggleMoreMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const menu = $('#moreMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
  function hideMoreMenu() { $('#moreMenu').style.display = 'none'; }
  window.toggleMoreMenu = toggleMoreMenu;
  window.hideMoreMenu = hideMoreMenu;

  document.addEventListener('click', (e) => {
    const menu = $('#moreMenu');
    if (menu && menu.style.display === 'block' && !e.target.closest('.more-menu') && !e.target.closest('[data-tab="MoreTab"]')) {
      hideMoreMenu();
    }
  });

  function setupNav() {
    $all('.nav-button').forEach(btn => {
      const tabId = btn.dataset.tab;
      if (tabId && tabId !== 'MoreTab') {
        btn.addEventListener('click', e => openTab(e, tabId));
      }
    });
  }

  function setupAccordions() {
    $all('.accordion').forEach(btn => {
      if (btn.classList.contains('accordion-modal')) return;
      btn.removeEventListener('click', btn._accordionHandler);
      btn._accordionHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const panel = btn.nextElementSibling;
        if (!panel || !panel.classList.contains('panel')) return;
        const isOpen = panel.style.display === 'block';
        $all('.panel').forEach(p => p.style.display = 'none');
        $all('.accordion').forEach(a => a.classList.remove('active'));
        if (!isOpen) {
          btn.classList.add('active');
          panel.style.display = 'block';
        }
      };
      btn.addEventListener('click', btn._accordionHandler);
    });
  }

  function setupDarkMode() {
    const stored = localStorage.getItem('darkMode');
    if (stored === '1') applyDarkMode(true);
    updateDarkModeToggle();
  }
  function applyDarkMode(dark) {
    document.body.classList.toggle('dark-mode', dark);
    const icon = $('#modeIcon');
    if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('darkMode', dark ? '1' : '0');
  }

  function getGPSLocation() {
    const result = $('#locationResult');
    if (!navigator.geolocation) { result.textContent = 'Geolocation not supported'; return; }
    result.textContent = 'Getting location...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;
        result.innerHTML = `<strong>Location:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}<br><a href="${link}" target="_blank">Open in Google Maps</a>`;
      },
      err => { result.textContent = 'Unable to get location: ' + err.message; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  window.getGPSLocation = getGPSLocation;

  function setMonthColor() {
    const month = new Date().getMonth();
    const color = MONTH_COLORS[month] || 'White';
    const el = $('#colorName');
    if (el) {
      el.textContent = color;
      el.className = 'month-color-badge color-' + color.toLowerCase();
    }
  }

  const DEFAULT_LOCATION = { lat: 24.1537, lon: 49.3553, name: 'Haradh, Saudi Arabia' };
  
  function getHeatStressLevel(tempC, humidity) {
    const tempF = (tempC * 9/5) + 32;
    let heatIndexF = tempF;
    
    if (tempF >= 80) {
      heatIndexF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
      
      if (humidity < 13 && tempF >= 80 && tempF <= 112) {
        heatIndexF -= ((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
      } else if (humidity > 85 && tempF >= 80 && tempF <= 87) {
        heatIndexF += ((humidity - 85) / 10) * ((87 - tempF) / 5);
      }
    }
    
    const heatIndexC = (heatIndexF - 32) * 5/9;
    
    if (heatIndexC < 27 || tempC < 27) return { level: 'low', title: 'Low Heat Stress', desc: 'Normal conditions. Stay hydrated.', icon: 'fa-thermometer-quarter' };
    if (heatIndexC < 32) return { level: 'moderate', title: 'Moderate Heat Stress', desc: 'Take regular water breaks. Monitor for fatigue.', icon: 'fa-thermometer-half' };
    if (heatIndexC < 41) return { level: 'high', title: 'High Heat Stress', desc: 'Limit heavy work. Mandatory rest breaks every 30 mins.', icon: 'fa-thermometer-three-quarters' };
    return { level: 'extreme', title: 'Extreme Heat Stress', desc: 'Stop non-essential outdoor work. Emergency protocols active.', icon: 'fa-thermometer-full' };
  }

  function getWeatherIcon(code) {
    if (code === 0) return 'fa-sun';
    if (code <= 3) return 'fa-cloud-sun';
    if (code <= 48) return 'fa-smog';
    if (code <= 67) return 'fa-cloud-rain';
    if (code <= 77) return 'fa-snowflake';
    if (code <= 82) return 'fa-cloud-showers-heavy';
    if (code <= 86) return 'fa-snowflake';
    return 'fa-bolt';
  }

  async function loadWeather(lat, lon, locationName) {
    const container = $('#weatherContent');
    if (!container) return;
    
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();
      
      const current = data.current;
      const temp = Math.round(current.temperature_2m);
      const feels = Math.round(current.apparent_temperature);
      const humidity = current.relative_humidity_2m;
      const windSpeed = Math.round(current.wind_speed_10m);
      const windGusts = Math.round(current.wind_gusts_10m);
      const weatherCode = current.weather_code;
      
      const heatStress = getHeatStressLevel(current.temperature_2m, humidity);
      const weatherIcon = getWeatherIcon(weatherCode);
      
      const windDir = current.wind_direction_10m;
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const windDirText = directions[Math.round(windDir / 45) % 8];
      
      container.innerHTML = `
        <div class="weather-main">
          <i class="fas ${weatherIcon} weather-icon"></i>
          <div>
            <div class="weather-temp-big">${temp}°C</div>
            <div class="weather-feels">Feels like ${feels}°C</div>
          </div>
        </div>
        <div class="weather-info-row">
          <div class="weather-info-item"><i class="fas fa-tint"></i> ${humidity}% Humidity</div>
          <div class="weather-info-item"><i class="fas fa-wind"></i> ${windSpeed} km/h ${windDirText}</div>
          <div class="weather-info-item"><i class="fas fa-wind"></i> Gusts ${windGusts} km/h</div>
        </div>
        <div class="heat-stress-box level-${heatStress.level}">
          <i class="fas ${heatStress.icon} heat-stress-icon"></i>
          <div class="heat-stress-details">
            <div class="heat-stress-title">${heatStress.title}</div>
            <div class="heat-stress-desc">${heatStress.desc}</div>
          </div>
        </div>
        <div class="weather-location"><i class="fas fa-map-marker-alt"></i> ${locationName}</div>
      `;
    } catch (err) {
      console.error('Weather error:', err);
      container.innerHTML = '<div class="weather-loading"><i class="fas fa-exclamation-circle"></i> Unable to load weather data</div>';
    }
  }

  async function refreshWeather() {
    const container = $('#weatherContent');
    if (container) container.innerHTML = '<div class="weather-loading"><i class="fas fa-spinner fa-spin"></i> Getting weather data...</div>';
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your Location'),
        () => loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.name),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.name);
    }
  }
  window.refreshWeather = refreshWeather;

  function setupTbtOfDay() {
    const day = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const tbt = TBT_DATA[day % TBT_DATA.length];
    const content = $('#homeTbtContent');
    if (content && tbt) {
      content.innerHTML = `<div class="tbt-title" style="font-weight:600;margin-bottom:.3rem">${tbt.title}</div><a href="${tbt.link}" target="_blank" style="color:var(--accent-blue);font-size:.85rem">Open TBT Document</a>`;
    }
  }

  let currentStatsPeriod = 'today';
  
  function setStatsPeriod(period) {
    currentStatsPeriod = period;
    $all('.period-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    loadStats(period);
  }
  window.setStatsPeriod = setStatsPeriod;

  async function loadStats(period = currentStatsPeriod) {
    const stats = await apiCall(`/stats?period=${period}`);
    if (!stats) return;
    
    const periodLabels = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month'
    };
    const label = periodLabels[period] || 'Today';
    
    if ($('#homeObsLabel')) $('#homeObsLabel').textContent = `Observations ${label}`;
    if ($('#homePermitsLabel')) $('#homePermitsLabel').textContent = `Permits ${label}`;
    if ($('#homeTbtLabel')) $('#homeTbtLabel').textContent = `TBT ${label}`;
    
    $('#homeObsToday').textContent = stats.observations.period;
    $('#homePermitsToday').textContent = stats.permits.period;
    $('#homeTbtToday').textContent = stats.toolboxTalks.period;
    $('#obsCountTotal').textContent = stats.observations.total;
    $('#obsCountOpen').textContent = stats.observations.open;
    $('#obsCountClosed').textContent = stats.observations.closed;
    $('#permitsCountTotal').textContent = stats.permits.total;
    $('#permitsCountAreas').textContent = stats.permits.areas;
    $('#permitsCountToday').textContent = stats.permits.period;
    $('#eqCountTotal').textContent = stats.equipment.total;
    $('#eqCountTps').textContent = stats.equipment.tpsExpiring;
    $('#eqCountIns').textContent = stats.equipment.insExpiring;
    $('#tbtCountTotal').textContent = stats.toolboxTalks.total;
  }

  function getLevelBadgeClass(level) {
    switch(level) {
      case 'Platinum': return 'level-platinum';
      case 'Gold': return 'level-gold';
      case 'Silver': return 'level-silver';
      default: return 'level-bronze';
    }
  }

  function getDefaultAvatar(name) {
    const initials = (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    return `<div class="default-avatar">${initials}</div>`;
  }

  async function loadLeaderboard() {
    const users = await apiCall('/leaderboard?period=month');
    if (!users) return;
    const mini = $('#homeLeaderboardMini');
    const full = $('#leaderboardContainer');
    if (mini) {
      mini.innerHTML = users.slice(0, 3).map((u, i) => {
        const medalClass = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : 'medal-bronze';
        const avatar = u.profile_pic ? `<img src="${u.profile_pic}" class="leaderboard-avatar" alt="${u.name}"/>` : getDefaultAvatar(u.name);
        const levelClass = getLevelBadgeClass(u.level);
        return `<div class="leaderboard-mini-item">
          <span class="leaderboard-medal ${medalClass}"><i class="fas fa-medal"></i></span>
          ${avatar}
          <div>
            <div class="leaderboard-name">${u.name} <span class="level-badge ${levelClass}">${u.level || 'Bronze'}</span></div>
            <div class="leaderboard-points">${u.monthly_points || u.points} pts</div>
          </div>
        </div>`;
      }).join('') || 'No data';
    }
    if (full) {
      full.innerHTML = users.map((u, i) => {
        const avatar = u.profile_pic ? `<img src="${u.profile_pic}" class="leaderboard-avatar" alt="${u.name}"/>` : getDefaultAvatar(u.name);
        const levelClass = getLevelBadgeClass(u.level);
        return `<div class="leaderboard-row">
          <span class="leaderboard-rank">#${i+1}</span>
          ${avatar}
          <div class="leaderboard-row-info">
            <span class="leaderboard-row-name">${u.name}</span>
            <span class="level-badge ${levelClass}">${u.level || 'Bronze'}</span>
          </div>
          <span class="leaderboard-row-points">${u.monthly_points || u.points} pts</span>
        </div>`;
      }).join('') || 'No data';
    }
  }

  async function loadEmployeeOfMonth() {
    const eom = await apiCall('/employee-of-month');
    const el = $('#employeeOfMonth');
    if (el) {
      if (eom) {
        const displayPoints = eom.monthly_points || eom.points || 0;
        const pointsLabel = eom.monthly_points > 0 ? 'this month' : 'total';
        el.innerHTML = `<div style="font-size:1.1rem;font-weight:700">${eom.name}</div><div style="font-size:.8rem;color:var(--text-soft)">${displayPoints} points ${pointsLabel}</div>`;
      } else {
        el.innerHTML = 'No data yet';
      }
    }
  }

  async function loadNews() {
    const news = await apiCall('/news');
    const container = $('#newsContainer');
    if (container) {
      container.innerHTML = news && news.length ? news.map(n => `<div class="news-item priority-${n.priority}"><h4>${n.title}</h4><p>${n.content}</p><div class="news-meta">Posted by ${n.created_by} on ${new Date(n.created_at).toLocaleDateString()}</div></div>`).join('') : 'No news';
    }
  }

  async function loadObservationStats() {
    const params = new URLSearchParams();
    if (state.obsRange !== 'all') params.append('range', state.obsRange);
    if (state.obsArea) params.append('area', state.obsArea);
    const stats = await apiCall(`/observations/stats?${params}`);
    if (stats) {
      if ($('#obsSummaryLabel')) $('#obsSummaryLabel').textContent = stats.rangeLabel;
      if ($('#obsCountTotal')) $('#obsCountTotal').textContent = stats.total;
      if ($('#obsCountOpen')) $('#obsCountOpen').textContent = stats.open;
      if ($('#obsCountClosed')) $('#obsCountClosed').textContent = stats.closed;
    }
  }

  async function loadMyReports() {
    if (!currentUser) {
      showToast('Please login to view your reports', 'error');
      return;
    }
    state.obsRange = 'all';
    state.obsArea = '';
    state.obsStatus = '';
    state.obsSearch = '';
    $all('.obs-filter-chip').forEach(c => c.classList.remove('active'));
    const allChip = Array.from($all('.obs-filter-chip')).find(c => c.dataset.range === 'all');
    if (allChip) allChip.classList.add('active');
    
    const obs = await apiCall(`/observations?reported_by_id=${currentUser.employee_id}`);
    const list = $('#observationsList');
    if (!list) return;
    if (!obs || !obs.length) { 
      list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">You have no reported observations yet</p>'; 
      return; 
    }
    list.innerHTML = obs.map(o => {
      const classType = o.observation_class === 'Positive' ? 'class-positive' : 'class-negative';
      const riskClass = o.risk_level === 'High' ? 'risk-high' : o.risk_level === 'Low' ? 'risk-low' : 'risk-medium';
      const badgeClass = o.risk_level === 'High' ? 'badge-high' : o.risk_level === 'Low' ? 'badge-low' : 'badge-medium';
      const statusClass = o.status === 'Open' ? 'status-open' : 'status-closed';
      return `<div class="obs-card ${classType}" onclick="viewObservation(${o.id})"><div class="obs-card-header"><span class="obs-card-title">${o.area || 'Unknown Area'}</span><div class="obs-card-badges"><span class="badge ${badgeClass}">${o.risk_level}</span><span class="status-pill ${statusClass}">${o.status}</span></div></div><div class="obs-card-date">${o.date} ${o.time || ''}</div><div class="obs-description">${(o.description || '').substring(0, 100)}...</div></div>`;
    }).join('');
  }
  window.loadMyReports = loadMyReports;

  async function loadPendingTasks() {
    state.obsRange = 'all';
    state.obsArea = '';
    state.obsStatus = 'Open';
    state.obsSearch = '';
    $all('.obs-filter-chip').forEach(c => c.classList.remove('active'));
    const allChip = Array.from($all('.obs-filter-chip')).find(c => c.dataset.range === 'all');
    if (allChip) allChip.classList.add('active');
    $('#obsFilterStatus').value = 'Open';
    await loadObservations();
  }
  window.loadPendingTasks = loadPendingTasks;

  async function loadObservations() {
    await loadObservationStats();
    const params = new URLSearchParams();
    if (state.obsRange !== 'all') params.append('range', state.obsRange);
    if (state.obsArea) params.append('area', state.obsArea);
    if (state.obsStatus) params.append('status', state.obsStatus);
    if (state.obsSearch) params.append('search', state.obsSearch);
    const obs = await apiCall(`/observations?${params}`);
    const list = $('#observationsList');
    if (!list) return;
    if (!obs || !obs.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No observations found</p>'; return; }
    list.innerHTML = obs.map(o => {
      const classType = o.observation_class === 'Positive' ? 'class-positive' : 'class-negative';
      const riskClass = o.risk_level === 'High' ? 'risk-high' : o.risk_level === 'Low' ? 'risk-low' : 'risk-medium';
      const badgeClass = o.risk_level === 'High' ? 'badge-high' : o.risk_level === 'Low' ? 'badge-low' : 'badge-medium';
      const statusClass = o.status === 'Open' ? 'status-open' : 'status-closed';
      const classLabel = o.observation_class === 'Positive' ? '<span class="obs-chip" style="background:#dcfce7;color:#15803d;border-color:#22c55e">Positive</span>' : '<span class="obs-chip" style="background:#fee2e2;color:#b91c1c;border-color:#ef4444">Negative</span>';
      return `<div class="obs-card ${classType}" onclick="viewObservation(${o.id})"><div class="obs-card-header"><span class="obs-card-title">${o.area || 'Unknown Area'}</span><div class="obs-card-badges"><span class="badge ${badgeClass}">${o.risk_level}</span><span class="status-pill ${statusClass}">${o.status}</span></div></div><div class="obs-card-date">${o.date} ${o.time || ''}</div><div class="obs-description">${(o.description || '').substring(0, 100)}...</div><div class="obs-chip-row">${classLabel}<span class="obs-chip">${o.observation_type || 'Observation'}</span>${o.activity_type ? `<span class="obs-chip">${o.activity_type}</span>` : ''}${o.reported_by ? `<span class="obs-chip">${o.reported_by}</span>` : ''}</div></div>`;
    }).join('');
  }
  window.viewObservation = async function(id) {
    const obs = await apiCall(`/observations/${id}`);
    if (!obs) return;
    
    window.currentObservationId = id;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(obs.evidence_urls || '[]'); } catch (e) {}
    let closeEvidenceUrls = [];
    try { closeEvidenceUrls = JSON.parse(obs.close_evidence_urls || '[]'); } catch (e) {}
    
    const statusClass = obs.status === 'Open' ? 'detail-status-open' : 'detail-status-closed';
    const riskClass = obs.risk_level === 'High' ? 'detail-risk-high' : obs.risk_level === 'Low' ? 'detail-risk-low' : 'detail-risk-medium';
    const classClass = obs.observation_class === 'Positive' ? 'detail-class-positive' : 'detail-class-negative';
    
    const caStatus = obs.corrective_action_status || 'Not Started';
    const caStatusClass = caStatus === 'Completed' ? 'ca-completed' : caStatus === 'In Progress' ? 'ca-inprogress' : 'ca-notstarted';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-info-circle"></i> Basic Information</div>
        <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${obs.date || ''} ${obs.time || ''}</span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${obs.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${obs.location || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="detail-status-badge ${statusClass}">${obs.status}</span></span></div>
        <div class="detail-row"><span class="detail-label">Risk Level</span><span class="detail-value"><span class="detail-status-badge ${riskClass}">${obs.risk_level || '-'}</span></span></div>
        <div class="detail-row"><span class="detail-label">Observation Class</span><span class="detail-value"><span class="detail-status-badge ${classClass}">${obs.observation_class || '-'}</span></span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-clipboard-list"></i> Observation Details</div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${obs.observation_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Activity Type</span><span class="detail-value">${obs.activity_type || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Description</span><div class="detail-value">${obs.description || '-'}</div></div>
        <div class="detail-row"><span class="detail-label">Direct Cause</span><span class="detail-value">${obs.direct_cause || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Root Cause</span><span class="detail-value">${obs.root_cause || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Immediate Action</span><div class="detail-value">${obs.immediate_action || '-'}</div></div>
        <div class="detail-full-row"><span class="detail-label">Corrective Action</span><div class="detail-value">${obs.corrective_action || '-'}</div></div>
      </div>`;
    
    html += `
      <div class="detail-section corrective-action-section">
        <div class="detail-section-title"><i class="fas fa-tasks"></i> Corrective Action Tracking</div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="ca-status-badge ${caStatusClass}">${caStatus}</span></span></div>
        <div class="detail-row"><span class="detail-label">Due Date</span><span class="detail-value">${obs.corrective_action_due_date || 'Not set'}</span></div>
        <div class="detail-row"><span class="detail-label">Assigned To</span><span class="detail-value">${obs.corrective_action_assigned_to || 'Not assigned'}</span></div>
        ${currentUser && obs.status === 'Open' ? `
        <div class="ca-actions">
          <button class="ca-btn ca-btn-notstarted ${caStatus === 'Not Started' ? 'active' : ''}" onclick="updateCorrectiveAction(${id}, 'Not Started')">Not Started</button>
          <button class="ca-btn ca-btn-inprogress ${caStatus === 'In Progress' ? 'active' : ''}" onclick="updateCorrectiveAction(${id}, 'In Progress')">In Progress</button>
          <button class="ca-btn ca-btn-completed ${caStatus === 'Completed' ? 'active' : ''}" onclick="updateCorrectiveAction(${id}, 'Completed')">Completed</button>
        </div>
        <div class="ca-update-form">
          <input type="date" id="caDueDate" value="${obs.corrective_action_due_date || ''}" placeholder="Due Date"/>
          <input type="text" id="caAssignedTo" value="${obs.corrective_action_assigned_to || ''}" placeholder="Assigned To"/>
          <button class="ca-save-btn" onclick="saveCorrectiveActionDetails(${id})"><i class="fas fa-save"></i> Save</button>
        </div>` : ''}
      </div>`;
    
    if (obs.injury_type || obs.injury_body_part) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-first-aid"></i> Injury Information</div>
        <div class="detail-row"><span class="detail-label">Injury Type</span><span class="detail-value">${obs.injury_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Body Part</span><span class="detail-value">${obs.injury_body_part || '-'}</span></div>
      </div>`;
    }
    
    html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-user"></i> Reporting</div>
        <div class="detail-row"><span class="detail-label">Reported By</span><span class="detail-value">${obs.reported_by || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Employee ID</span><span class="detail-value">${obs.reported_by_id || '-'}</span></div>
      </div>`;
    
    if (evidenceUrls.length > 0 && closeEvidenceUrls.length > 0) {
      html += `
      <div class="detail-section before-after-section">
        <div class="detail-section-title"><i class="fas fa-exchange-alt"></i> Before / After Comparison</div>
        <div class="before-after-container">
          <div class="before-after-column">
            <div class="before-after-label"><i class="fas fa-camera"></i> BEFORE</div>
            <div class="before-after-images">${evidenceUrls.map(url => `<img src="${convertDriveUrl(url)}" data-original-url="${url}" onclick="openImageViewer('${url}')" onerror="handleImageError(this)" alt="Before"/>`).join('')}</div>
          </div>
          <div class="before-after-divider"><i class="fas fa-arrow-right"></i></div>
          <div class="before-after-column">
            <div class="before-after-label"><i class="fas fa-check-circle"></i> AFTER</div>
            <div class="before-after-images">${closeEvidenceUrls.map(url => `<img src="${convertDriveUrl(url)}" data-original-url="${url}" onclick="openImageViewer('${url}')" onerror="handleImageError(this)" alt="After"/>`).join('')}</div>
          </div>
        </div>
      </div>`;
    } else {
      if (evidenceUrls.length > 0) {
        html += `
        <div class="detail-section">
          <div class="detail-section-title"><i class="fas fa-camera"></i> Before Photos (Initial Evidence)</div>
          <div class="detail-images">${evidenceUrls.map(url => `<img src="${convertDriveUrl(url)}" data-original-url="${url}" onclick="openImageViewer('${url}')" onerror="handleImageError(this)" alt="Evidence"/>`).join('')}</div>
        </div>`;
      }
      
      if (closeEvidenceUrls.length > 0) {
        html += `
        <div class="detail-section">
          <div class="detail-section-title"><i class="fas fa-check-circle"></i> After Photos (Closure Evidence)</div>
          <div class="detail-images">${closeEvidenceUrls.map(url => `<img src="${convertDriveUrl(url)}" data-original-url="${url}" onclick="openImageViewer('${url}')" onerror="handleImageError(this)" alt="Closure Evidence"/>`).join('')}</div>
        </div>`;
      }
    }
    
    if (obs.status === 'Closed') {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-check-circle"></i> Closure Information</div>
        <div class="detail-row"><span class="detail-label">Closed By</span><span class="detail-value">${obs.closed_by || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Closed Date</span><span class="detail-value">${obs.closed_date || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Closure Notes</span><div class="detail-value">${obs.closed_notes || '-'}</div></div>
      </div>`;
    }
    
    if (currentUser && obs.status === 'Open') {
      html += `
      <div class="detail-section close-observation-section">
        <div class="detail-section-title"><i class="fas fa-check-double"></i> Close This Observation</div>
        <p style="color:var(--text-soft);font-size:0.9rem;margin-bottom:1rem;">When the issue has been resolved, close the observation with closure notes and "after" photos.</p>
        <button class="close-obs-action-btn" onclick="openCloseObservationModal(${id})">
          <i class="fas fa-check-circle"></i> Close Observation
        </button>
      </div>`;
    }
    
    if (currentUser && currentUser.role === 'admin') {
      html += `
      <div class="detail-section admin-actions-section">
        <div class="detail-section-title"><i class="fas fa-user-shield"></i> Admin Actions</div>
        <div class="admin-action-buttons">
          <button class="admin-delete-btn" onclick="deleteObservation(${id})">
            <i class="fas fa-trash-alt"></i> Delete Observation
          </button>
        </div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-eye"></i> Observation #' + obs.id;
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };
  
  window.deleteObservation = async function(id) {
    if (!confirm('Are you sure you want to delete this observation? This action cannot be undone.')) return;
    const result = await apiCall(`/observations/${id}`, { method: 'DELETE' });
    if (result && result.success) {
      alert('Observation deleted successfully');
      closeModal('viewDetailsModal');
      loadObservations();
    } else {
      alert('Failed to delete observation. Admin privileges required.');
    }
  };
  
  window.updateCorrectiveAction = async function(id, status) {
    const result = await apiCall(`/observations/${id}/corrective-action`, {
      method: 'PUT',
      body: JSON.stringify({ corrective_action_status: status })
    });
    if (result) {
      viewObservation(id);
    }
  };
  
  window.saveCorrectiveActionDetails = async function(id) {
    const dueDate = $('#caDueDate')?.value || null;
    const assignedTo = $('#caAssignedTo')?.value || null;
    const result = await apiCall(`/observations/${id}/corrective-action`, {
      method: 'PUT',
      body: JSON.stringify({ 
        corrective_action_due_date: dueDate,
        corrective_action_assigned_to: assignedTo
      })
    });
    if (result) {
      viewObservation(id);
    }
  };

  window.openCloseObservationModal = function(id) {
    $('#closeObsId').value = id;
    $('#closeObsNotes').value = '';
    $('#closeObsPhotos').value = '';
    closeModal('viewDetailsModal');
    openModal('closeObservationModal');
  };

  $('#closeObservationForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = $('#closeObsId').value;
    if (!id) return;
    
    const closeEvidenceUrls = await uploadPhotos($('#closeObsPhotos'));
    const closedNotes = $('#closeObsNotes').value;
    
    const result = await apiCall(`/observations/${id}/close`, {
      method: 'PUT',
      body: JSON.stringify({
        closed_notes: closedNotes,
        close_evidence_urls: closeEvidenceUrls
      })
    });
    
    if (result) {
      showToast('Observation closed successfully (+5 pts)', 'success');
      closeModal('closeObservationModal');
      loadObservations();
      loadStats();
      loadUserPoints();
    } else {
      showToast('Failed to close observation', 'error');
    }
  });

  window.viewPermit = async function(id) {
    const permit = await apiCall(`/permits/${id}`);
    if (!permit) return;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(permit.evidence_urls || '[]'); } catch (e) {}
    
    const statusClass = permit.status === 'Active' ? 'detail-status-open' : 'detail-status-closed';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-clipboard-check"></i> Permit Information</div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${permit.date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Permit Number</span><span class="detail-value">${permit.permit_number || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Permit Type</span><span class="detail-value">${permit.permit_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="detail-status-badge ${statusClass}">${permit.status}</span></span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${permit.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Project</span><span class="detail-value">${permit.project || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-users"></i> Personnel</div>
        <div class="detail-row"><span class="detail-label">Receiver</span><span class="detail-value">${permit.receiver || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Issuer</span><span class="detail-value">${permit.issuer || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Created By</span><span class="detail-value">${permit.created_by || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-file-alt"></i> Description</div>
        <div class="detail-full-row"><div class="detail-value">${permit.description || 'No description provided'}</div></div>
      </div>`;
    
    if (evidenceUrls.length > 0) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-camera"></i> Evidence Photos</div>
        <div class="detail-images">${evidenceUrls.map(url => `<img src="${convertDriveUrl(url)}" data-original-url="${url}" onclick="openImageViewer('${url}')" onerror="handleImageError(this)" alt="Evidence"/>`).join('')}</div>
      </div>`;
    }
    
    if (permit.status === 'Closed') {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-check-circle"></i> Closure Information</div>
        <div class="detail-row"><span class="detail-label">Closed By</span><span class="detail-value">${permit.closed_by || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Closed Date</span><span class="detail-value">${permit.closed_date || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Closure Notes</span><div class="detail-value">${permit.closed_notes || '-'}</div></div>
      </div>`;
    }
    
    if (currentUser && currentUser.role === 'admin') {
      html += `
      <div class="detail-section admin-actions-section">
        <div class="detail-section-title"><i class="fas fa-user-shield"></i> Admin Actions</div>
        <div class="admin-action-buttons">
          <button class="admin-delete-btn" onclick="deletePermit(${id})">
            <i class="fas fa-trash-alt"></i> Delete Permit
          </button>
        </div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-clipboard-check"></i> Permit #' + permit.id;
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };
  
  window.deletePermit = async function(id) {
    if (!confirm('Are you sure you want to delete this permit? This action cannot be undone.')) return;
    const result = await apiCall(`/permits/${id}`, { method: 'DELETE' });
    if (result && result.success) {
      alert('Permit deleted successfully');
      closeModal('viewDetailsModal');
      loadPermits();
    } else {
      alert('Failed to delete permit. Admin privileges required.');
    }
  };

  window.viewEquipment = async function(id) {
    const eq = await apiCall(`/equipment/${id}`);
    if (!eq) return;
    
    const statusClass = eq.status === 'In Service' ? 'detail-status-open' : 'detail-status-closed';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-truck"></i> Equipment Information</div>
        <div class="detail-row"><span class="detail-label">Asset Number</span><span class="detail-value">${eq.asset_number || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Equipment Type</span><span class="detail-value">${eq.equipment_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Owner</span><span class="detail-value">${eq.owner || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Yard/Area</span><span class="detail-value">${eq.yard_area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="detail-status-badge ${statusClass}">${eq.status}</span></span></div>
        <div class="detail-row"><span class="detail-label">PWAS Required</span><span class="detail-value">${eq.pwas_required || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-calendar-alt"></i> Inspection Dates</div>
        <div class="detail-row"><span class="detail-label">TPS Date</span><span class="detail-value">${eq.tps_date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">TPS Expiry</span><span class="detail-value">${eq.tps_expiry || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">INS Date</span><span class="detail-value">${eq.ins_date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">INS Expiry</span><span class="detail-value">${eq.ins_expiry || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-user"></i> Operator Information</div>
        <div class="detail-row"><span class="detail-label">Operator Name</span><span class="detail-value">${eq.operator_name || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Operator License</span><span class="detail-value">${eq.operator_license || '-'}</span></div>
      </div>`;
    
    if (eq.notes) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-sticky-note"></i> Notes</div>
        <div class="detail-full-row"><div class="detail-value">${eq.notes}</div></div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-truck"></i> Equipment: ' + (eq.asset_number || eq.equipment_type || '#' + eq.id);
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };

  window.viewTbt = async function(id) {
    const tbt = await apiCall(`/toolbox-talks/${id}`);
    if (!tbt) return;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(tbt.evidence_urls || '[]'); } catch (e) {}
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-chalkboard-teacher"></i> Toolbox Talk Information</div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${tbt.date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Topic</span><span class="detail-value">${tbt.topic || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Presenter</span><span class="detail-value">${tbt.presenter || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${tbt.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Attendance</span><span class="detail-value">${tbt.attendance || 0} attendees</span></div>
        <div class="detail-row"><span class="detail-label">Created By</span><span class="detail-value">${tbt.created_by || '-'}</span></div>
      </div>`;
    
    if (tbt.description) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-file-alt"></i> Description</div>
        <div class="detail-full-row"><div class="detail-value">${tbt.description}</div></div>
      </div>`;
    }
    
    if (evidenceUrls.length > 0) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-camera"></i> Evidence Photos</div>
        <div class="detail-images">${evidenceUrls.map(url => `<img src="${convertDriveUrl(url)}" data-original-url="${url}" onclick="openImageViewer('${url}')" onerror="handleImageError(this)" alt="Evidence"/>`).join('')}</div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Toolbox Talk #' + tbt.id;
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };

  window.printDetails = function() {
    const content = $('#viewDetailsContent').innerHTML;
    const title = $('#viewDetailsTitle').textContent;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Safety Observer</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; }
          .print-header { display: flex; align-items: center; gap: 15px; border-bottom: 3px solid #0ea5e9; padding-bottom: 15px; margin-bottom: 20px; }
          .print-logo { width: 60px; height: 60px; border-radius: 8px; }
          .print-title-area h1 { font-size: 20px; color: #0369a1; margin-bottom: 4px; }
          .print-title-area p { font-size: 12px; color: #64748b; }
          .print-doc-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 20px; padding: 10px; background: #f1f5f9; border-radius: 8px; }
          .detail-section { margin-bottom: 15px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .detail-section-title { font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          .detail-label { font-weight: 600; color: #475569; }
          .detail-value { color: #1e293b; }
          .detail-full-row { padding: 8px 0; font-size: 12px; }
          .detail-full-row .detail-label { display: block; margin-bottom: 4px; }
          .detail-status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .detail-status-open { background: #dcfce7; color: #15803d; }
          .detail-status-closed { background: #fee2e2; color: #b91c1c; }
          .detail-risk-high { background: #fee2e2; color: #dc2626; }
          .detail-risk-medium { background: #fef3c7; color: #d97706; }
          .detail-risk-low { background: #dcfce7; color: #16a34a; }
          .detail-class-positive { background: #dcfce7; color: #15803d; }
          .detail-class-negative { background: #fee2e2; color: #b91c1c; }
          .detail-images { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
          .detail-images img { max-width: 200px; max-height: 150px; border-radius: 6px; border: 1px solid #e2e8f0; }
          .before-after-container { display: flex; gap: 20px; }
          .before-after-column { flex: 1; }
          .before-after-label { text-align: center; font-weight: 700; font-size: 12px; padding: 6px; border-radius: 6px; margin-bottom: 8px; }
          .before-after-column:first-child .before-after-label { background: #fee2e2; color: #dc2626; }
          .before-after-column:last-child .before-after-label { background: #dcfce7; color: #16a34a; }
          .before-after-images img { width: 100%; max-height: 200px; object-fit: contain; }
          .ca-status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .ca-notstarted { background: #e2e8f0; color: #64748b; }
          .ca-inprogress { background: #dbeafe; color: #2563eb; }
          .ca-completed { background: #dcfce7; color: #16a34a; }
          .ca-actions, .ca-update-form { display: none; }
          .print-footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <img src="img/CAT.jpeg" class="print-logo" alt="Logo"/>
          <div class="print-title-area">
            <h1>Safety Observer</h1>
            <p>Saudi Safety Group - CAT Project</p>
          </div>
        </div>
        <div class="print-doc-title">${title}</div>
        ${content}
        <div class="print-footer">
          Generated on ${new Date().toLocaleString()} | Safety Observer - Saudi Safety Group
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  async function loadAreas() {
    const obsAreas = await apiCall('/observations/areas');
    const permitAreas = await apiCall('/permits/areas');
    const permitTypes = await apiCall('/permits/types');
    const eqAreas = await apiCall('/equipment/areas');
    if (obsAreas) {
      const sel = $('#obsFilterArea');
      if (sel) obsAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
    if (permitAreas) {
      const sel = $('#permitsFilterArea');
      if (sel) permitAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
    if (permitTypes) {
      const sel = $('#permitsFilterType');
      if (sel) permitTypes.forEach(t => sel.innerHTML += `<option value="${t}">${t}</option>`);
    }
    if (eqAreas) {
      const sel = $('#eqFilterArea');
      if (sel) eqAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
  }

  function setupObsFilters() {
    $all('.obs-filter-chip:not(.permits-chip):not(.tbt-chip)').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.obs-filter-chip:not(.permits-chip):not(.tbt-chip)').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.obsRange = chip.dataset.range;
        $('#obsSummaryLabel').textContent = chip.textContent;
        loadObservations();
      });
    });
    $('#obsFilterArea')?.addEventListener('change', e => { state.obsArea = e.target.value; loadObservations(); });
    $('#obsFilterStatus')?.addEventListener('change', e => { state.obsStatus = e.target.value; loadObservations(); });
    $('#obsSearch')?.addEventListener('input', debounce(e => { state.obsSearch = e.target.value; loadObservations(); }, 300));
  }

  async function loadPermitStats() {
    const params = new URLSearchParams();
    if (state.permitsRange !== 'all') params.append('range', state.permitsRange);
    if (state.permitsArea) params.append('area', state.permitsArea);
    if (state.permitsType) params.append('type', state.permitsType);
    const stats = await apiCall(`/permits/stats?${params}`);
    if (stats) {
      if ($('#permitsSummaryLabel')) $('#permitsSummaryLabel').textContent = stats.rangeLabel;
      if ($('#permitsCountTotal')) $('#permitsCountTotal').textContent = stats.total;
      if ($('#permitsCountAreas')) $('#permitsCountAreas').textContent = stats.areas;
      if ($('#permitsCountToday')) $('#permitsCountToday').textContent = stats.total;
    }
  }

  async function loadPermits() {
    await loadPermitStats();
    const params = new URLSearchParams();
    if (state.permitsRange !== 'all') params.append('range', state.permitsRange);
    if (state.permitsArea) params.append('area', state.permitsArea);
    if (state.permitsType) params.append('type', state.permitsType);
    if (state.permitsSearch) params.append('search', state.permitsSearch);
    const permits = await apiCall(`/permits?${params}`);
    const list = $('#permitsList');
    if (!list) return;
    if (!permits || !permits.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No permits found</p>'; return; }
    list.innerHTML = permits.map(p => {
      const typeClass = p.permit_type === 'Hot Work' ? 'badge-high' : p.permit_type === 'Confined Space' ? 'badge-medium' : 'badge-low';
      return `<div class="obs-card" onclick="viewPermit(${p.id})"><div class="obs-card-header"><span class="obs-card-title">${p.area || 'Unknown'}</span><span class="badge ${typeClass}">${p.permit_type || 'General'}</span></div><div class="obs-card-date">${p.date}</div><div class="obs-description">${p.description || p.project || ''}</div><div class="obs-chip-row">${p.receiver ? `<span class="obs-chip">Receiver: ${p.receiver}</span>` : ''}${p.permit_number ? `<span class="obs-chip">#${p.permit_number}</span>` : ''}</div></div>`;
    }).join('');
  }

  function setupPermitsFilters() {
    $all('.permits-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.permits-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.permitsRange = chip.dataset.range;
        $('#permitsSummaryLabel').textContent = chip.textContent;
        loadPermits();
      });
    });
    $('#permitsFilterArea')?.addEventListener('change', e => { state.permitsArea = e.target.value; loadPermits(); });
    $('#permitsFilterType')?.addEventListener('change', e => { state.permitsType = e.target.value; loadPermits(); });
    $('#permitsSearch')?.addEventListener('input', debounce(e => { state.permitsSearch = e.target.value; loadPermits(); }, 300));
  }

  async function loadEquipment() {
    const params = new URLSearchParams();
    if (state.eqArea) params.append('area', state.eqArea);
    if (state.eqStatus) params.append('status', state.eqStatus);
    if (state.eqSearch) params.append('search', state.eqSearch);
    const equipment = await apiCall(`/equipment?${params}`);
    const list = $('#equipmentList');
    if (!list) return;
    if (!equipment || !equipment.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No equipment found</p>'; return; }
    list.innerHTML = equipment.map(e => {
      const statusClass = e.status === 'In Service' ? 'status-open' : 'status-closed';
      return `<div class="obs-card" onclick="viewEquipment(${e.id})"><div class="obs-card-header"><span class="obs-card-title">${e.equipment_type || 'Equipment'}</span><span class="status-pill ${statusClass}">${e.status}</span></div><div class="obs-card-date">Asset: ${e.asset_number || 'N/A'}</div><div class="obs-chip-row"><span class="obs-chip">${e.yard_area || 'Unknown'}</span>${e.pwas_required ? `<span class="obs-chip">PWAS: ${e.pwas_required}</span>` : ''}</div></div>`;
    }).join('');
  }

  function setupEqFilters() {
    $('#eqFilterArea')?.addEventListener('change', e => { state.eqArea = e.target.value; loadEquipment(); });
    $('#eqFilterStatus')?.addEventListener('change', e => { state.eqStatus = e.target.value; loadEquipment(); });
    $('#eqSearch')?.addEventListener('input', debounce(e => { state.eqSearch = e.target.value; loadEquipment(); }, 300));
  }

  async function loadTbtStats() {
    const params = new URLSearchParams();
    if (state.tbtRange !== 'all') params.append('range', state.tbtRange);
    const stats = await apiCall(`/toolbox-talks/stats?${params}`);
    if (stats) {
      if ($('#tbtSummaryLabel')) $('#tbtSummaryLabel').textContent = stats.rangeLabel;
      if ($('#tbtCountTotal')) $('#tbtCountTotal').textContent = stats.total;
      if ($('#tbtCountFiltered')) $('#tbtCountFiltered').textContent = stats.total;
      if ($('#tbtAvgAttendance')) $('#tbtAvgAttendance').textContent = stats.avgAttendance;
    }
  }

  async function loadTbt() {
    await loadTbtStats();
    const params = new URLSearchParams();
    if (state.tbtRange !== 'all') params.append('range', state.tbtRange);
    if (state.tbtSearch) params.append('search', state.tbtSearch);
    const talks = await apiCall(`/toolbox-talks?${params}`);
    const list = $('#tbtList');
    if (!list) return;
    if (!talks || !talks.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No toolbox talks found</p>'; return; }
    list.innerHTML = talks.map(t => `<div class="obs-card" onclick="viewTbt(${t.id})"><div class="obs-card-header"><span class="obs-card-title">${t.topic || 'TBT'}</span><span class="badge badge-low">${t.attendance || 0} attendees</span></div><div class="obs-card-date">${t.date} - ${t.presenter || 'Unknown'}</div><div class="obs-chip-row"><span class="obs-chip">${t.area || 'General'}</span></div></div>`).join('');
    const filtered = talks.length;
    const avg = talks.length ? Math.round(talks.reduce((s, t) => s + (t.attendance || 0), 0) / talks.length) : 0;
    $('#tbtCountFiltered').textContent = filtered;
    $('#tbtAvgAttendance').textContent = avg;
  }

  function setupTbtFilters() {
    $all('.tbt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.tbt-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.tbtRange = chip.dataset.range;
        $('#tbtSummaryLabel').textContent = chip.textContent;
        loadTbt();
      });
    });
    $('#tbtSearch')?.addEventListener('input', debounce(e => { state.tbtSearch = e.target.value; loadTbt(); }, 300));
  }

  let currentLibrary = null;
  function getLibraryData(type) {
    switch(type) {
      case 'tbt': return TBT_DATA;
      case 'jsa': return JSA_DATA;
      case 'csm': return CSM_DATA;
      case 'walkthrough': return WALKTHROUGH_DATA;
      default: return [];
    }
  }
  function openLibrarySection(type) {
    currentLibrary = type;
    const data = getLibraryData(type);
    renderLibrary(data);
    $('.library-grid').style.display = 'none';
    $('#libraryContent').style.display = 'block';
  }
  function closeLibrarySection() {
    $('.library-grid').style.display = 'grid';
    $('#libraryContent').style.display = 'none';
    currentLibrary = null;
  }
  function renderLibrary(data, filter = '') {
    const list = $('#libraryList');
    const filtered = filter ? data.filter(d => d.title.toLowerCase().includes(filter.toLowerCase())) : data;
    list.innerHTML = filtered.map(d => `<div class="library-item"><span class="library-item-title">${d.title}</span><a href="${d.link}" target="_blank">Open</a></div>`).join('') || 'No documents found';
  }
  window.openLibrarySection = openLibrarySection;
  window.closeLibrarySection = closeLibrarySection;
  $('#librarySearch')?.addEventListener('input', e => {
    const data = getLibraryData(currentLibrary);
    renderLibrary(data, e.target.value);
  });

  function toggleToolSection(id) {
    const sections = ['trainingMatrix', 'heatStress', 'windSpeed', 'riskMatrix', 'lifeSaving', 'challenges', 'quiz'];
    sections.forEach(s => {
      const el = document.getElementById(s + 'Section');
      if (el) el.style.display = s === id && el.style.display !== 'block' ? 'block' : 'none';
    });
    if (id === 'challenges') loadChallenges();
  }
  window.toggleToolSection = toggleToolSection;

  function calculateHeatIndex() {
    const temp = parseFloat($('#inputTemp')?.value);
    const humidity = parseFloat($('#inputHumidity')?.value);
    if (isNaN(temp) || isNaN(humidity)) return;
    const hi = temp + 0.5555 * (6.11 * Math.exp(5417.7530 * (1/273.16 - 1/(273.16 + temp))) * humidity / 100 - 10);
    const result = $('#heatIndexResult');
    const status = $('#heatRiskLevel');
    result.textContent = hi.toFixed(1) + '°C';
    if (hi >= 54) { status.textContent = 'EXTREME DANGER - Stop work'; status.style.color = '#b91c1c'; }
    else if (hi >= 41) { status.textContent = 'DANGER - Limit exposure'; status.style.color = '#dc2626'; }
    else if (hi >= 32) { status.textContent = 'CAUTION - Hydrate frequently'; status.style.color = '#f59e0b'; }
    else { status.textContent = 'Safe conditions'; status.style.color = '#22c55e'; }
  }
  window.calculateHeatIndex = calculateHeatIndex;

  function calculateWindSafety() {
    const wind = parseFloat($('#inputWind')?.value);
    if (isNaN(wind)) return;
    const result = $('#windResult');
    const status = $('#windRestrictions');
    if (wind > 55) { result.textContent = 'STOP WORK'; result.style.color = '#b91c1c'; status.textContent = 'All outdoor work suspended'; }
    else if (wind > 40) { result.textContent = 'RESTRICTED'; result.style.color = '#dc2626'; status.textContent = 'Stop crane ops, review WAH'; }
    else if (wind > 25) { result.textContent = 'CAUTION'; result.style.color = '#f59e0b'; status.textContent = 'Secure loose materials'; }
    else { result.textContent = 'SAFE'; result.style.color = '#22c55e'; status.textContent = 'Normal operations'; }
  }
  window.calculateWindSafety = calculateWindSafety;

  async function loadChallenges() {
    const challenges = await apiCall('/challenges');
    const list = $('#challengesList');
    if (!list) return;
    if (!challenges || !challenges.length) { list.innerHTML = '<p>No challenges today. Check back tomorrow!</p>'; return; }
    
    const completions = await apiCall('/challenges/my-completions');
    const completedIds = Array.isArray(completions) ? completions.map(c => c.challenge_id) : [];
    
    list.innerHTML = challenges.map(c => {
      const badgeHtml = c.badge_reward ? `<span class="challenge-badge"><i class="fas ${getBadgeIcon(c.badge_reward)}"></i> ${c.badge_reward}</span>` : '';
      const isCompleted = completedIds.includes(c.id);
      const actionHtml = isCompleted 
        ? '<span class="challenge-completed"><i class="fas fa-check-circle"></i> Completed</span>'
        : `<button class="challenge-complete-btn" onclick="completeChallenge(${c.id})"><i class="fas fa-check"></i> Complete</button>`;
      return `<div class="challenge-card">
        <div class="challenge-info">
          <h4>${c.title}</h4>
          <p>${c.description || ''}</p>
          ${badgeHtml}
          ${actionHtml}
        </div>
        <span class="challenge-points">${c.points} pts</span>
      </div>`;
    }).join('');
  }

  async function completeChallenge(challengeId) {
    if (!authToken) {
      alert('Please login to complete challenges');
      return;
    }
    const result = await apiCall(`/challenges/${challengeId}/complete`, { method: 'POST', body: JSON.stringify({}) });
    if (result && result.success) {
      await updateUserPoints();
      updateHeaderBadge();
      loadSettingsData();
      loadChallenges();
      
      let message = `Challenge completed! You earned ${result.points_earned} points.`;
      if (result.badge_earned) {
        message += `\n\nYou also earned a new badge: ${result.badge_earned}!`;
      }
      alert(message);
    } else if (result && result.error) {
      alert(result.error);
    }
  }
  window.completeChallenge = completeChallenge;

  async function uploadPhotos(input) {
    if (!input.files.length) return [];
    const formData = new FormData();
    for (const file of input.files) formData.append('photos', file);
    try {
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      return data.urls || [];
    } catch (e) { console.error('Upload error:', e); return []; }
  }

  async function loadAreasDropdown() {
    const areas = await apiCall('/areas');
    const sel = $('#obsAreaSelect');
    if (sel && areas) {
      sel.innerHTML = '<option value="">-- Select Area --</option>';
      areas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
  }

  async function loadSettingsDropdown(selectId, settingsType, placeholder) {
    const items = await apiCall(`/settings/${settingsType}`);
    const sel = $(selectId);
    if (sel && items) {
      sel.innerHTML = `<option value="">${placeholder}</option>`;
      items.forEach(item => sel.innerHTML += `<option value="${item.name}">${item.name}</option>`);
    }
  }

  async function loadObservationDropdowns() {
    await loadAreasDropdown();
    await loadSettingsDropdown('#obsActivityType', 'activity_types', '-- Activity Type --');
    await loadSettingsDropdown('#obsType', 'observation_types', '-- Observation Type --');
    await loadSettingsDropdown('#obsDirectCauseSelect', 'direct_causes', '-- Select Direct Cause --');
    await loadSettingsDropdown('#obsRootCauseSelect', 'root_causes', '-- Select Root Cause --');
  }

  async function loadPermitDropdowns() {
    await loadSettingsDropdown('#permitType', 'permit_types', '-- Permit Type --');
  }

  async function loadEquipmentDropdowns() {
    await loadSettingsDropdown('#eqType', 'equipment_types', '-- Equipment Type --');
    await loadSettingsDropdown('#eqYardArea', 'yard_areas', '-- Yard/Area --');
  }

  async function loadTbtDropdowns() {
    await loadSettingsDropdown('#tbtTopic', 'tbt_topics', '-- Select Topic --');
  }

  function showAddAreaInput() {
    $('#addAreaInput').style.display = 'flex';
    $('#newAreaName').focus();
  }
  window.showAddAreaInput = showAddAreaInput;

  function hideAddAreaInput() {
    $('#addAreaInput').style.display = 'none';
    $('#newAreaName').value = '';
  }
  window.hideAddAreaInput = hideAddAreaInput;

  async function addNewArea() {
    const name = $('#newAreaName').value.trim();
    if (!name) return;
    const result = await apiCall('/areas', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.success) {
      await loadAreasDropdown();
      $('#obsAreaSelect').value = name;
      hideAddAreaInput();
    }
  }
  window.addNewArea = addNewArea;

  function showAddDirectCauseInput() {
    $('#addDirectCauseInput').style.display = 'flex';
    $('#newDirectCauseName').focus();
  }
  window.showAddDirectCauseInput = showAddDirectCauseInput;

  function hideAddDirectCauseInput() {
    $('#addDirectCauseInput').style.display = 'none';
    $('#newDirectCauseName').value = '';
  }
  window.hideAddDirectCauseInput = hideAddDirectCauseInput;

  async function addNewDirectCause() {
    const name = $('#newDirectCauseName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/direct_causes', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#obsDirectCauseSelect', 'direct_causes', '-- Select Direct Cause --');
      $('#obsDirectCauseSelect').value = name;
      hideAddDirectCauseInput();
    }
  }
  window.addNewDirectCause = addNewDirectCause;

  function showAddRootCauseInput() {
    $('#addRootCauseInput').style.display = 'flex';
    $('#newRootCauseName').focus();
  }
  window.showAddRootCauseInput = showAddRootCauseInput;

  function hideAddRootCauseInput() {
    $('#addRootCauseInput').style.display = 'none';
    $('#newRootCauseName').value = '';
  }
  window.hideAddRootCauseInput = hideAddRootCauseInput;

  async function addNewRootCause() {
    const name = $('#newRootCauseName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/root_causes', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#obsRootCauseSelect', 'root_causes', '-- Select Root Cause --');
      $('#obsRootCauseSelect').value = name;
      hideAddRootCauseInput();
    }
  }
  window.addNewRootCause = addNewRootCause;

  function showAddPermitTypeInput() {
    $('#addPermitTypeInput').style.display = 'flex';
    $('#newPermitTypeName').focus();
  }
  window.showAddPermitTypeInput = showAddPermitTypeInput;

  function hideAddPermitTypeInput() {
    $('#addPermitTypeInput').style.display = 'none';
    $('#newPermitTypeName').value = '';
  }
  window.hideAddPermitTypeInput = hideAddPermitTypeInput;

  async function addNewPermitType() {
    const name = $('#newPermitTypeName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/permit_types', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#permitType', 'permit_types', '-- Permit Type --');
      $('#permitType').value = name;
      hideAddPermitTypeInput();
      showToast('Permit type added', 'success');
    } else {
      showToast('Failed to add permit type', 'error');
    }
  }
  window.addNewPermitType = addNewPermitType;

  function showAddEquipmentTypeInput() {
    $('#addEquipmentTypeInput').style.display = 'flex';
    $('#newEquipmentTypeName').focus();
  }
  window.showAddEquipmentTypeInput = showAddEquipmentTypeInput;

  function hideAddEquipmentTypeInput() {
    $('#addEquipmentTypeInput').style.display = 'none';
    $('#newEquipmentTypeName').value = '';
  }
  window.hideAddEquipmentTypeInput = hideAddEquipmentTypeInput;

  async function addNewEquipmentType() {
    const name = $('#newEquipmentTypeName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/equipment_types', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#eqType', 'equipment_types', '-- Equipment Type --');
      $('#eqType').value = name;
      hideAddEquipmentTypeInput();
      showToast('Equipment type added', 'success');
    } else {
      showToast('Failed to add equipment type', 'error');
    }
  }
  window.addNewEquipmentType = addNewEquipmentType;

  function showAddYardAreaInput() {
    $('#addYardAreaInput').style.display = 'flex';
    $('#newYardAreaName').focus();
  }
  window.showAddYardAreaInput = showAddYardAreaInput;

  function hideAddYardAreaInput() {
    $('#addYardAreaInput').style.display = 'none';
    $('#newYardAreaName').value = '';
  }
  window.hideAddYardAreaInput = hideAddYardAreaInput;

  async function addNewYardArea() {
    const name = $('#newYardAreaName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/yard_areas', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#eqYardArea', 'yard_areas', '-- Yard/Area --');
      $('#eqYardArea').value = name;
      hideAddYardAreaInput();
      showToast('Yard/Area added', 'success');
    } else {
      showToast('Failed to add yard/area', 'error');
    }
  }
  window.addNewYardArea = addNewYardArea;

  function showAddTbtTopicInput() {
    $('#addTbtTopicInput').style.display = 'flex';
    $('#newTbtTopicName').focus();
  }
  window.showAddTbtTopicInput = showAddTbtTopicInput;

  function hideAddTbtTopicInput() {
    $('#addTbtTopicInput').style.display = 'none';
    $('#newTbtTopicName').value = '';
  }
  window.hideAddTbtTopicInput = hideAddTbtTopicInput;

  async function addNewTbtTopic() {
    const name = $('#newTbtTopicName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/tbt_topics', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#tbtTopic', 'tbt_topics', '-- Select Topic --');
      $('#tbtTopic').value = name;
      hideAddTbtTopicInput();
      showToast('TBT topic added', 'success');
    } else {
      showToast('Failed to add TBT topic', 'error');
    }
  }
  window.addNewTbtTopic = addNewTbtTopic;

  function setObservationClass(cls) {
    $('#obsClass').value = cls;
    if (cls === 'Positive') {
      $('#btnPositive').classList.add('active');
      $('#btnNegative').classList.remove('active');
      $('#injurySection').style.display = 'none';
    } else {
      $('#btnNegative').classList.add('active');
      $('#btnPositive').classList.remove('active');
      const obsType = $('#obsType')?.value || '';
      const showInjury = ['Near Miss', 'Unsafe Act', 'Unsafe Condition'].includes(obsType);
      $('#injurySection').style.display = showInjury ? 'block' : 'none';
    }
  }
  window.setObservationClass = setObservationClass;

  $('#obsType')?.addEventListener('change', function() {
    const val = this.value;
    const obsClass = $('#obsClass').value;
    const showInjury = obsClass === 'Negative' && ['Near Miss', 'Unsafe Act', 'Unsafe Condition'].includes(val);
    $('#injurySection').style.display = showInjury ? 'block' : 'none';
  });

  function resetObservationForm() {
    $('#obsClass').value = 'Negative';
    $('#btnNegative').classList.add('active');
    $('#btnPositive').classList.remove('active');
    $('#injurySection').style.display = 'none';
    $('#addAreaInput').style.display = 'none';
    $('#newAreaName').value = '';
    $('#addDirectCauseInput').style.display = 'none';
    $('#newDirectCauseName').value = '';
    $('#addRootCauseInput').style.display = 'none';
    $('#newRootCauseName').value = '';
  }

  const origOpenModal = window.openModal;
  window.openModal = function(id) {
    if (id === 'addObservationModal') {
      resetObservationForm();
    }
    origOpenModal(id);
  };

  $('#addObservationForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const evidenceUrls = await uploadPhotos($('#obsPhotos'));
    const data = {
      date: $('#obsDate').value,
      time: $('#obsTime').value,
      area: $('#obsAreaSelect').value,
      location: $('#obsLocation').value,
      observation_type: $('#obsType').value,
      description: $('#obsDescription').value,
      direct_cause: $('#obsDirectCauseSelect').value,
      root_cause: $('#obsRootCauseSelect').value,
      immediate_action: $('#obsImmediateAction').value,
      corrective_action: $('#obsCorrectiveAction').value,
      risk_level: $('#obsRiskLevel').value,
      evidence_urls: evidenceUrls,
      activity_type: $('#obsActivityType').value,
      observation_class: $('#obsClass').value,
      injury_type: $('#obsInjuryType')?.value || '',
      injury_body_part: $('#obsInjuryBodyPart')?.value || ''
    };
    const result = await apiCall('/observations', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addObservationModal');
      e.target.reset();
      $('#obsClass').value = 'Negative';
      $('#btnNegative').classList.add('active');
      $('#btnPositive').classList.remove('active');
      $('#injurySection').style.display = 'none';
      loadObservations();
      loadStats();
      updateUserPoints();
    }
  });

  $('#addPermitForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      date: $('#permitDate').value,
      area: $('#permitArea').value,
      permit_type: $('#permitType').value,
      permit_number: $('#permitNumber').value,
      project: $('#permitProject').value,
      receiver: $('#permitReceiver').value,
      issuer: $('#permitIssuer').value,
      description: $('#permitDescription').value
    };
    const result = await apiCall('/permits', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addPermitModal');
      e.target.reset();
      loadPermits();
      loadStats();
      updateUserPoints();
    }
  });

  $('#addEquipmentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      asset_number: $('#eqAssetNumber').value,
      equipment_type: $('#eqType').value,
      owner: $('#eqOwner').value,
      yard_area: $('#eqYardArea').value,
      status: $('#eqStatus').value,
      pwas_required: $('#eqPwas').value,
      tps_date: $('#eqTpsDate').value,
      tps_expiry: $('#eqTpsExpiry').value,
      ins_date: $('#eqInsDate').value,
      ins_expiry: $('#eqInsExpiry').value,
      operator_name: $('#eqOperator').value,
      operator_license: $('#eqLicense').value,
      notes: $('#eqNotes').value
    };
    const result = await apiCall('/equipment', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addEquipmentModal');
      e.target.reset();
      loadEquipment();
      loadStats();
    }
  });

  $('#addTbtForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const evidenceUrls = await uploadPhotos($('#tbtPhotos'));
    const data = {
      date: $('#tbtDate').value,
      topic: $('#tbtTopic').value,
      presenter: $('#tbtPresenter').value,
      area: $('#tbtArea').value,
      attendance: parseInt($('#tbtAttendance').value) || 0,
      description: $('#tbtDescription').value,
      evidence_urls: evidenceUrls
    };
    const result = await apiCall('/toolbox-talks', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addTbtModal');
      e.target.reset();
      loadTbt();
      loadStats();
      updateUserPoints();
    }
  });

  $('#addNewsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title: $('#newsTitle').value,
      content: $('#newsContent').value,
      priority: $('#newsPriority').value
    };
    const result = await apiCall('/news', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addNewsModal');
      e.target.reset();
      loadNews();
    }
  });

  $('#addChallengeForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const editId = $('#editChallengeId').value;
    const data = {
      title: $('#challengeTitle').value,
      description: $('#challengeDescription').value,
      challenge_type: $('#challengeType').value || 'daily',
      points: parseInt($('#challengePoints').value) || 10,
      badge_reward: $('#challengeBadgeReward').value || null,
      challenge_date: $('#challengeDate').value || null
    };
    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `/challenges/${editId}` : '/challenges';
    const result = await apiCall(endpoint, { method, body: JSON.stringify(data) });
    if (result) {
      closeModal('addChallengeModal');
      resetChallengeForm();
      loadChallengesByType('daily');
      if (typeof loadAdminChallenges === 'function') loadAdminChallenges();
      alert(editId ? 'Challenge updated!' : 'Challenge created!');
    }
  });

  async function updateUserPoints() {
    if (!authToken) return;
    const user = await apiCall('/auth/me');
    if (user) {
      currentUser = user;
      $('#userPoints').textContent = user.points;
    }
  }

  function checkAuth() {
    if (!authToken) {
      openModal('loginModal');
      return false;
    }
    return true;
  }

  function showLoggedInUI() {
    $('#pointsDisplay').style.display = 'flex';
    updateHeaderBadge();
    if (currentUser?.role === 'admin') {
      $('#adminMenuBtn').style.display = 'block';
    }
    loadSettingsData();
  }

  function updateHeaderBadge() {
    const badgeEl = $('#headerBadge');
    if (!badgeEl) return;
    
    if (currentUser?.badges) {
      let badges = [];
      try { badges = JSON.parse(currentUser.badges); } catch(e) {}
      if (badges.length > 0) {
        const topBadge = badges[0];
        badgeEl.innerHTML = `<i class="fas ${getBadgeIcon(topBadge)}"></i>`;
        badgeEl.title = topBadge;
        badgeEl.style.display = 'flex';
        return;
      }
    }
    badgeEl.style.display = 'none';
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    $('#pointsDisplay').style.display = 'none';
    $('#headerBadge').style.display = 'none';
    $('#adminMenuBtn').style.display = 'none';
    openModal('loginModal');
    openTab(null, 'HomeTab');
  }
  window.logout = logout;

  async function loadSettingsData() {
    if (!currentUser) return;
    
    try {
      const freshUser = await apiCall('/auth/me');
      if (freshUser && freshUser.id) {
        Object.assign(currentUser, freshUser);
      }
    } catch(e) {}
    
    const points = currentUser.points || 0;
    const level = currentUser.level || Math.floor(points / 100) + 1;
    
    $('#userPoints').textContent = points;
    updateHeaderBadge();
    
    $('#settingsUserName').textContent = currentUser.name || 'User';
    $('#settingsEmployeeId').textContent = 'ID: ' + (currentUser.employee_id || '-');
    $('#settingsUserRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Safety Observer';
    $('#settingsPoints').textContent = points;
    $('#settingsLevel').textContent = level;
    
    if (currentUser.profile_pic) {
      $('#settingsProfilePic').src = currentUser.profile_pic;
    } else {
      $('#settingsProfilePic').src = 'img/default-avatar.svg';
    }
    
    const badgesContainer = $('#settingsBadges');
    if (currentUser.badges) {
      let badges = [];
      try { badges = JSON.parse(currentUser.badges); } catch(e) {}
      if (badges.length > 0) {
        badgesContainer.innerHTML = badges.map(b => `
          <div class="badge-item">
            <i class="fas ${getBadgeIcon(b)}"></i>
            <span>${b}</span>
          </div>
        `).join('');
      } else {
        badgesContainer.innerHTML = '<div class="no-badges">No badges earned yet. Keep up the good work!</div>';
      }
    } else {
      badgesContainer.innerHTML = '<div class="no-badges">No badges earned yet. Keep up the good work!</div>';
    }
    
    updateDarkModeToggle();
  }
  window.loadSettingsData = loadSettingsData;

  function getBadgeIcon(badgeName) {
    const icons = {
      'First Observer': 'fa-eye',
      'Safety Champion': 'fa-shield-alt',
      'Top Performer': 'fa-trophy',
      'Team Player': 'fa-users',
      'Quick Responder': 'fa-bolt',
      'Mentor': 'fa-chalkboard-teacher',
      'Risk Spotter': 'fa-exclamation-triangle',
      'Safety Star': 'fa-star'
    };
    return icons[badgeName] || 'fa-medal';
  }

  function updateDarkModeToggle() {
    const toggle = $('#darkModeToggle');
    if (toggle) {
      const isDark = document.body.classList.contains('dark-mode');
      toggle.classList.toggle('active', isDark);
    }
  }

  function toggleDarkModeSettings() {
    const isDark = document.body.classList.contains('dark-mode');
    applyDarkMode(!isDark);
    updateDarkModeToggle();
  }
  window.toggleDarkModeSettings = toggleDarkModeSettings;

  async function uploadProfilePicture(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      const base64 = e.target.result;
      
      try {
        const result = await apiCall('/users/profile-picture', {
          method: 'PUT',
          body: JSON.stringify({ profile_picture: base64 })
        });
        
        if (result?.success) {
          currentUser.profile_pic = base64;
          $('#settingsProfilePic').src = base64;
        }
      } catch (err) {
        console.error('Failed to upload profile picture:', err);
      }
    };
    
    reader.readAsDataURL(file);
  }
  window.uploadProfilePicture = uploadProfilePicture;

  $all('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $all('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      $('#loginForm').style.display = isLogin ? 'flex' : 'none';
      $('#registerForm').style.display = isLogin ? 'none' : 'flex';
    });
  });

  $('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      employee_id: $('#loginEmployeeId').value,
      password: $('#loginPassword').value
    };
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.pending) {
        $('#loginError').innerHTML = '<span style="color:#b45309"><i class="fas fa-clock"></i> ' + result.error + '</span>';
      } else if (result.error) {
        $('#loginError').textContent = result.error;
        $('#loginError').style.color = '#dc2626';
      } else {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        closeModal('loginModal');
        showLoggedInUI();
        $('#userPoints').textContent = currentUser.points;
        init();
      }
    } catch (err) {
      $('#loginError').textContent = 'Login failed';
    }
  });

  $('#registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      employee_id: $('#regEmployeeId').value,
      name: $('#regName').value,
      password: $('#regPassword').value
    };
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.error) {
        $('#registerError').textContent = result.error;
        $('#registerError').style.color = '#dc2626';
      } else if (result.pending) {
        $('#registerError').innerHTML = '<span style="color:#059669">&#10003; ' + result.message + '</span>';
        $('#regEmployeeId').value = '';
        $('#regName').value = '';
        $('#regPassword').value = '';
      } else {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        closeModal('loginModal');
        showLoggedInUI();
        $('#userPoints').textContent = currentUser.points;
        init();
      }
    } catch (err) {
      $('#registerError').textContent = 'Registration failed';
    }
  });

  $('#newsToggleButton')?.addEventListener('click', () => {
    loadNews();
    openModal('newsModal');
  });

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function loadPendingUsers() {
    const container = $('#adminContent');
    container.innerHTML = '<p>Loading pending registrations...</p>';
    const users = await apiCall('/users/pending');
    if (!users || !Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<div class="no-data">No pending registrations</div>';
      return;
    }
    let html = '<h3><i class="fas fa-user-clock"></i> Pending Approvals</h3><div class="admin-list">';
    users.forEach(u => {
      html += `<div class="admin-user-item" id="pending-${u.id}">
        <div class="user-info">
          <strong>${u.name}</strong>
          <span class="user-id">${u.employee_id}</span>
          <span class="user-date">${new Date(u.created_at).toLocaleDateString()}</span>
        </div>
        <div class="user-actions">
          <button class="btn btn-success btn-sm" onclick="approveUser(${u.id})"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectUser(${u.id})"><i class="fas fa-times"></i> Reject</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }
  window.loadPendingUsers = loadPendingUsers;

  async function approveUser(userId) {
    const result = await apiCall(`/users/${userId}/approve`, { method: 'PUT' });
    if (result?.success) {
      const el = document.getElementById(`pending-${userId}`);
      if (el) el.remove();
      const remaining = document.querySelectorAll('.admin-user-item').length;
      if (remaining === 0) {
        $('#adminContent').innerHTML = '<div class="no-data">No pending registrations</div>';
      }
      updatePendingCount();
    }
  }
  window.approveUser = approveUser;

  async function rejectUser(userId) {
    if (!confirm('Are you sure you want to reject this registration? This will delete the user.')) return;
    const result = await apiCall(`/users/${userId}/reject`, { method: 'PUT' });
    if (result?.success) {
      const el = document.getElementById(`pending-${userId}`);
      if (el) el.remove();
      const remaining = document.querySelectorAll('.admin-user-item').length;
      if (remaining === 0) {
        $('#adminContent').innerHTML = '<div class="no-data">No pending registrations</div>';
      }
      updatePendingCount();
    }
  }
  window.rejectUser = rejectUser;

  async function updatePendingCount() {
    if (currentUser?.role !== 'admin') return;
    const users = await apiCall('/users/pending');
    const count = Array.isArray(users) ? users.length : 0;
    const badge = $('#pendingCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  async function loadAdminUsers() {
    const container = $('#adminContent');
    container.innerHTML = '<p>Loading users...</p>';
    const users = await apiCall('/users');
    if (!users || !Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<div class="no-data">No users found</div>';
      return;
    }
    let html = '<h3><i class="fas fa-users"></i> All Users</h3><div class="admin-list">';
    users.forEach(u => {
      const approvedText = u.approved ? '<span class="badge badge-success">Approved</span>' : '<span class="badge badge-warning">Pending</span>';
      html += `<div class="admin-user-item">
        <div class="user-info">
          <strong>${u.name}</strong>
          <span class="user-id">${u.employee_id}</span>
          <span class="user-role badge badge-${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role}</span>
          ${approvedText}
          <span class="user-points">${u.points} pts</span>
        </div>
        <div class="user-actions">
          <button class="btn btn-sm" onclick="adjustUserPoints(${u.id}, '${u.name}')"><i class="fas fa-star"></i> Points</button>
          ${u.role !== 'admin' ? `<button class="btn btn-sm" onclick="toggleUserRole(${u.id}, '${u.role}')"><i class="fas fa-user-shield"></i> Toggle Admin</button>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }
  window.loadAdminUsers = loadAdminUsers;

  async function adjustUserPoints(userId, userName) {
    const points = prompt(`Adjust points for ${userName} (use negative to deduct):`);
    if (points === null) return;
    const reason = prompt('Reason for adjustment:') || 'Admin adjustment';
    await apiCall(`/users/${userId}/points`, {
      method: 'PUT',
      body: JSON.stringify({ points: parseInt(points), reason })
    });
    loadAdminUsers();
  }
  window.adjustUserPoints = adjustUserPoints;

  async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await apiCall(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    loadAdminUsers();
  }
  window.toggleUserRole = toggleUserRole;

  let adminChallengeType = 'daily';
  
  async function loadAdminChallenges(type = null) {
    if (type) adminChallengeType = type;
    const container = $('#adminContent');
    container.innerHTML = `
      <h3><i class="fas fa-tasks"></i> Manage Challenges</h3>
      <button class="btn btn-primary" onclick="openAddChallengeModal()" style="margin-bottom:1rem"><i class="fas fa-plus"></i> Add Challenge</button>
      <div class="challenge-tabs">
        <button class="challenge-tab ${adminChallengeType === 'daily' ? 'active' : ''}" onclick="loadAdminChallenges('daily')">Daily</button>
        <button class="challenge-tab ${adminChallengeType === 'weekly' ? 'active' : ''}" onclick="loadAdminChallenges('weekly')">Weekly</button>
        <button class="challenge-tab ${adminChallengeType === 'monthly' ? 'active' : ''}" onclick="loadAdminChallenges('monthly')">Monthly</button>
      </div>
      <div id="adminChallengesList" style="margin-top:1rem;">Loading...</div>`;
    
    const challenges = await apiCall(`/challenges/all?type=${adminChallengeType}`);
    const list = document.getElementById('adminChallengesList');
    if (!challenges || !Array.isArray(challenges) || challenges.length === 0) {
      list.innerHTML = `<div class="no-data">No ${adminChallengeType} challenges. Click "Add Challenge" to create one.</div>`;
      return;
    }
    let html = '<div class="admin-list">';
    challenges.forEach(c => {
      const badgeHtml = c.badge_reward ? `<span class="challenge-badge-admin"><i class="fas ${getBadgeIcon(c.badge_reward)}"></i> ${c.badge_reward}</span>` : '';
      const statusClass = c.is_active ? 'status-active' : 'status-inactive';
      html += `<div class="admin-challenge-item">
        <div class="challenge-main-info">
          <strong>${c.title}</strong>
          <p style="margin:.25rem 0;font-size:.85rem;color:var(--text-soft)">${c.description || 'No description'}</p>
        </div>
        <div class="challenge-meta">
          <span class="challenge-type-badge type-${c.challenge_type || 'daily'}">${(c.challenge_type || 'daily').toUpperCase()}</span>
          <span class="user-points">${c.points} pts</span>
          ${badgeHtml}
          <span class="${statusClass}">${c.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="admin-challenge-actions">
          <button class="btn-edit" onclick="openEditChallengeModal(${c.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deleteChallenge(${c.id}, '${c.title.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
  }
  window.loadAdminChallenges = loadAdminChallenges;

  function openAddChallengeModal() {
    resetChallengeForm();
    openModal('addChallengeModal');
  }
  window.openAddChallengeModal = openAddChallengeModal;

  function resetChallengeForm() {
    $('#editChallengeId').value = '';
    $('#challengeTitle').value = '';
    $('#challengeDescription').value = '';
    $('#challengeType').value = 'daily';
    $('#challengePoints').value = '10';
    $('#challengeBadgeReward').value = '';
    $('#challengeDate').value = '';
    $('#challengeModalTitle').innerHTML = '<i class="fas fa-tasks"></i> Add Challenge (Admin)';
    $('#challengeSubmitBtn').innerHTML = '<i class="fas fa-plus-circle"></i> Create Challenge';
  }
  window.resetChallengeForm = resetChallengeForm;

  async function openEditChallengeModal(id) {
    const challenges = await apiCall(`/challenges/all`);
    const challenge = challenges?.find(c => c.id === id);
    if (!challenge) { alert('Challenge not found'); return; }
    
    $('#editChallengeId').value = challenge.id;
    $('#challengeTitle').value = challenge.title || '';
    $('#challengeDescription').value = challenge.description || '';
    $('#challengeType').value = challenge.challenge_type || 'daily';
    $('#challengePoints').value = challenge.points || 10;
    $('#challengeBadgeReward').value = challenge.badge_reward || '';
    $('#challengeDate').value = challenge.challenge_date || '';
    $('#challengeModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Challenge';
    $('#challengeSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Update Challenge';
    openModal('addChallengeModal');
  }
  window.openEditChallengeModal = openEditChallengeModal;

  async function deleteChallenge(id, title) {
    if (!confirm(`Delete challenge "${title}"? This cannot be undone.`)) return;
    const result = await apiCall(`/challenges/${id}`, { method: 'DELETE' });
    if (result) {
      alert('Challenge deleted');
      loadAdminChallenges();
    }
  }
  window.deleteChallenge = deleteChallenge;

  let adminQuizCategory = '';
  
  async function loadAdminQuizQuestions(category = null) {
    if (category !== null) adminQuizCategory = category;
    const container = $('#adminContent');
    container.innerHTML = `
      <h3><i class="fas fa-question-circle"></i> Manage Quiz Questions</h3>
      <button class="btn btn-primary" onclick="openAddQuizQuestionModal()" style="margin-bottom:1rem"><i class="fas fa-plus"></i> Add Question</button>
      <select id="adminQuizCategoryFilter" onchange="loadAdminQuizQuestions(this.value)" style="padding:.5rem;border-radius:8px;border:1px solid var(--card-border);margin-left:.5rem">
        <option value="" ${adminQuizCategory === '' ? 'selected' : ''}>All Categories</option>
        <option value="CSM Requirements" ${adminQuizCategory === 'CSM Requirements' ? 'selected' : ''}>CSM Requirements</option>
        <option value="PPE Standards" ${adminQuizCategory === 'PPE Standards' ? 'selected' : ''}>PPE Standards</option>
        <option value="Work Permits" ${adminQuizCategory === 'Work Permits' ? 'selected' : ''}>Work Permits</option>
        <option value="Heat Stress" ${adminQuizCategory === 'Heat Stress' ? 'selected' : ''}>Heat Stress</option>
        <option value="Confined Space" ${adminQuizCategory === 'Confined Space' ? 'selected' : ''}>Confined Space</option>
        <option value="Working at Height" ${adminQuizCategory === 'Working at Height' ? 'selected' : ''}>Working at Height</option>
        <option value="Hot Work Safety" ${adminQuizCategory === 'Hot Work Safety' ? 'selected' : ''}>Hot Work Safety</option>
        <option value="Excavation Safety" ${adminQuizCategory === 'Excavation Safety' ? 'selected' : ''}>Excavation Safety</option>
        <option value="Lifting Operations" ${adminQuizCategory === 'Lifting Operations' ? 'selected' : ''}>Lifting Operations</option>
        <option value="Fire Safety" ${adminQuizCategory === 'Fire Safety' ? 'selected' : ''}>Fire Safety</option>
        <option value="Emergency Procedures" ${adminQuizCategory === 'Emergency Procedures' ? 'selected' : ''}>Emergency Procedures</option>
        <option value="General Safety" ${adminQuizCategory === 'General Safety' ? 'selected' : ''}>General Safety</option>
      </select>
      <div id="adminQuizQuestionsList" style="margin-top:1rem;">Loading...</div>`;
    
    let questions = await apiCall('/quiz/questions/all');
    const list = document.getElementById('adminQuizQuestionsList');
    if (!questions || !Array.isArray(questions)) {
      list.innerHTML = '<div class="no-data">No questions found.</div>';
      return;
    }
    
    if (adminQuizCategory) {
      questions = questions.filter(q => q.category === adminQuizCategory);
    }
    
    if (questions.length === 0) {
      list.innerHTML = `<div class="no-data">No questions ${adminQuizCategory ? 'in ' + adminQuizCategory : ''}. Click "Add Question" to create one.</div>`;
      return;
    }
    
    let html = `<div class="quiz-count" style="margin-bottom:.5rem;color:var(--text-soft);font-size:.85rem">${questions.length} question${questions.length !== 1 ? 's' : ''}</div><div class="admin-list">`;
    questions.forEach(q => {
      const statusClass = q.is_active ? 'status-active' : 'status-inactive';
      html += `<div class="admin-quiz-item">
        <div class="quiz-main-info">
          <span class="quiz-category-badge">${q.category || 'General'}</span>
          <div class="quiz-question-preview">${(q.question || '').substring(0, 100)}${q.question?.length > 100 ? '...' : ''}</div>
          <div class="quiz-answer-preview">
            <span class="correct-answer">Correct: ${q.correct_answer}</span>
            <span class="${statusClass}">${q.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div class="admin-quiz-actions">
          <button class="btn-edit" onclick="openEditQuizQuestionModal(${q.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deleteQuizQuestion(${q.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
  }
  window.loadAdminQuizQuestions = loadAdminQuizQuestions;

  function openAddQuizQuestionModal() {
    resetQuizQuestionForm();
    openModal('addQuizQuestionModal');
  }
  window.openAddQuizQuestionModal = openAddQuizQuestionModal;

  function resetQuizQuestionForm() {
    $('#editQuizQuestionId').value = '';
    $('#quizQuestionCategory').value = '';
    $('#quizQuestionText').value = '';
    $('#quizOptionA').value = '';
    $('#quizOptionB').value = '';
    $('#quizOptionC').value = '';
    $('#quizOptionD').value = '';
    $('#quizCorrectAnswer').value = '';
    $('#quizExplanation').value = '';
    $('#quizQuestionModalTitle').innerHTML = '<i class="fas fa-question-circle"></i> Add Quiz Question';
    $('#quizQuestionSubmitBtn').innerHTML = '<i class="fas fa-plus-circle"></i> Add Question';
  }
  window.resetQuizQuestionForm = resetQuizQuestionForm;

  async function openEditQuizQuestionModal(id) {
    const questions = await apiCall('/quiz/questions/all');
    const question = questions?.find(q => q.id === id);
    if (!question) { alert('Question not found'); return; }
    
    $('#editQuizQuestionId').value = question.id;
    $('#quizQuestionCategory').value = question.category || '';
    $('#quizQuestionText').value = question.question || '';
    $('#quizOptionA').value = question.option_a || '';
    $('#quizOptionB').value = question.option_b || '';
    $('#quizOptionC').value = question.option_c || '';
    $('#quizOptionD').value = question.option_d || '';
    $('#quizCorrectAnswer').value = question.correct_answer || '';
    $('#quizExplanation').value = question.explanation || '';
    $('#quizQuestionModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Quiz Question';
    $('#quizQuestionSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Update Question';
    openModal('addQuizQuestionModal');
  }
  window.openEditQuizQuestionModal = openEditQuizQuestionModal;

  async function deleteQuizQuestion(id) {
    if (!confirm('Delete this quiz question? This cannot be undone.')) return;
    const result = await apiCall(`/quiz/questions/${id}`, { method: 'DELETE' });
    if (result) {
      alert('Question deleted');
      loadAdminQuizQuestions();
    }
  }
  window.deleteQuizQuestion = deleteQuizQuestion;

  $('#addQuizQuestionForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const editId = $('#editQuizQuestionId').value;
    const data = {
      category: $('#quizQuestionCategory').value,
      question: $('#quizQuestionText').value,
      option_a: $('#quizOptionA').value,
      option_b: $('#quizOptionB').value,
      option_c: $('#quizOptionC').value,
      option_d: $('#quizOptionD').value,
      correct_answer: $('#quizCorrectAnswer').value,
      explanation: $('#quizExplanation').value
    };
    const method = editId ? 'PUT' : 'POST';
    const endpoint = editId ? `/quiz/questions/${editId}` : '/quiz/questions';
    const result = await apiCall(endpoint, { method, body: JSON.stringify(data) });
    if (result) {
      closeModal('addQuizQuestionModal');
      resetQuizQuestionForm();
      loadAdminQuizQuestions();
      alert(editId ? 'Question updated!' : 'Question added!');
    }
  });

  async function importHistoricalObservations() {
    const clearFirst = confirm('Do you want to CLEAR all existing observations before importing?\n\nClick OK to clear and reimport fresh.\nClick Cancel to add new records only (skip duplicates).');
    if (!confirm('This will import historical observations from the Google Sheets CSV. Continue?')) return;
    const container = $('#adminContent');
    container.innerHTML = '<h3><i class="fas fa-file-import"></i> Importing Historical Data...</h3><div class="import-progress"><i class="fas fa-spinner fa-spin"></i> Please wait, fetching and importing data from Google Sheets...</div>';
    try {
      const result = await apiCall('/import-observations', { method: 'POST', body: JSON.stringify({ clearFirst }) });
      if (result && result.success) {
        let errorsHtml = '';
        if (result.errors && result.errors.length > 0) {
          errorsHtml = '<div class="import-errors"><h4 style="color:#dc2626;margin:.5rem 0">Row Errors:</h4>';
          result.errors.forEach(e => {
            errorsHtml += `<div class="import-error-item">Code ${e.code}: ${e.error}</div>`;
          });
          errorsHtml += '</div>';
        }
        container.innerHTML = `<h3><i class="fas fa-check-circle" style="color:#22c55e"></i> Import Complete</h3>
          <div class="import-result">
            <div class="import-stat"><strong>${result.imported}</strong> observations imported</div>
            <div class="import-stat"><strong>${result.skipped}</strong> records skipped (duplicates or empty)</div>
            <div class="import-stat"><strong>${result.total}</strong> total records in CSV</div>
          </div>
          ${errorsHtml}
          <button class="btn btn-primary" onclick="loadObservations();openTab(null,'ObservationsTab')"><i class="fas fa-eye"></i> View Observations</button>`;
        loadStats();
        loadAreas();
        loadAreasDropdown();
        loadObservations();
      } else {
        container.innerHTML = `<h3><i class="fas fa-exclamation-triangle" style="color:#dc2626"></i> Import Failed</h3><p>${result?.error || 'Unknown error occurred'}</p>`;
      }
    } catch (err) {
      container.innerHTML = `<h3><i class="fas fa-exclamation-triangle" style="color:#dc2626"></i> Import Failed</h3><p>${err.message}</p>`;
    }
  }
  window.importHistoricalObservations = importHistoricalObservations;

  let areasChartInstance = null;
  async function loadAreasChart() {
    try {
      const data = await apiCall('/observations/by-area');
      const canvas = document.getElementById('areasChart');
      const noDataEl = $('#areasChartNoData');
      
      if (!canvas) return;
      
      if (!data || data.length === 0) {
        canvas.style.display = 'none';
        if (noDataEl) noDataEl.style.display = 'block';
        return;
      }
      
      canvas.style.display = 'block';
      if (noDataEl) noDataEl.style.display = 'none';
      
      const labels = data.map(d => d.area);
      const values = data.map(d => d.count);
      const colors = ['#22c55e', '#0ea5e9', '#f97316', '#8b5cf6', '#ef4444'];
      
      if (areasChartInstance) {
        areasChartInstance.destroy();
      }
      
      areasChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, data.length),
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 12,
                usePointStyle: true,
                font: { size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.raw / total) * 100).toFixed(1);
                  return `${context.label}: ${context.raw} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error loading areas chart:', err);
    }
  }

  async function init() {
    setupNav();
    setupAccordions();
    setupDarkMode();
    setMonthColor();
    setupTbtOfDay();
    setupObsFilters();
    setupPermitsFilters();
    setupEqFilters();
    setupTbtFilters();
    if (authToken) {
      const user = await apiCall('/auth/me');
      if (user) {
        currentUser = user;
        showLoggedInUI();
        $('#userPoints').textContent = user.points;
        if (user.role === 'admin') {
          updatePendingCount();
        }
      } else {
        logout();
        return;
      }
    } else {
      openModal('loginModal');
    }
    loadStats();
    loadLeaderboard();
    loadEmployeeOfMonth();
    loadAreasChart();
    refreshWeather();
    loadAreas();
    loadAreasDropdown();
    loadObservations();
    loadPermits();
    loadEquipment();
    loadTbt();
  }

  let currentChallengeType = 'daily';
  let quizQuestions = [];
  let quizAnswers = [];
  let currentQuestionIndex = 0;

  async function loadChallengesByType(type) {
    currentChallengeType = type;
    $all('.challenge-tab').forEach(t => t.classList.remove('active'));
    const activeTab = Array.from($all('.challenge-tab')).find(t => t.textContent.toLowerCase().includes(type));
    if (activeTab) activeTab.classList.add('active');
    
    const container = $('#challengesList');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading challenges...</div>';
    
    const challenges = await apiCall(`/challenges?type=${type}`);
    const completions = currentUser ? await apiCall('/challenges/my-completions') : [];
    const completedIds = Array.isArray(completions) ? completions.map(c => c.challenge_id) : [];
    
    if (!challenges || challenges.length === 0) {
      container.innerHTML = `<div class="no-challenges"><i class="fas fa-clipboard-list"></i><p>No ${type} challenges available</p></div>`;
      return;
    }
    
    container.innerHTML = challenges.map(ch => {
      const isCompleted = completedIds.includes(ch.id);
      return `
        <div class="challenge-card ${isCompleted ? 'completed' : ''}">
          <div class="challenge-header">
            <div class="challenge-title">${ch.title}</div>
            <div class="challenge-points"><i class="fas fa-star"></i> ${ch.points} pts</div>
          </div>
          <div class="challenge-description">${ch.description || ''}</div>
          ${ch.badge_reward ? `<div class="challenge-badge"><i class="fas fa-medal"></i> Earn: ${ch.badge_reward}</div>` : ''}
          ${isCompleted ? 
            `<div class="challenge-status completed"><i class="fas fa-check-circle"></i> Completed</div>` :
            `<button class="challenge-complete-btn" onclick="openChallengeComplete(${ch.id}, '${ch.title.replace(/'/g, "\\'")}')"><i class="fas fa-camera"></i> Complete Challenge</button>`
          }
        </div>
      `;
    }).join('');
  }
  window.loadChallengesByType = loadChallengesByType;

  window.openChallengeComplete = function(id, title) {
    if (!currentUser) {
      alert('Please login to complete challenges');
      return;
    }
    const html = `
      <div class="challenge-complete-form">
        <h4>${title}</h4>
        <p>Upload photo evidence to complete this challenge:</p>
        <div class="upload-area">
          <input type="file" id="challengeEvidence" accept="image/*" onchange="previewChallengeEvidence(this)"/>
          <div id="challengeEvidencePreview" class="evidence-preview"></div>
        </div>
        <div class="form-group">
          <label>Comments (optional)</label>
          <textarea id="challengeComments" placeholder="Add any comments..."></textarea>
        </div>
        <div class="challenge-form-buttons">
          <button class="btn-cancel" onclick="closeModal('viewDetailsModal')">Cancel</button>
          <button class="btn-submit" onclick="submitChallengeCompletion(${id})"><i class="fas fa-check"></i> Submit</button>
        </div>
      </div>
    `;
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-tasks"></i> Complete Challenge';
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };

  window.previewChallengeEvidence = function(input) {
    const preview = $('#challengeEvidencePreview');
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = e => preview.innerHTML = `<img src="${e.target.result}" alt="Evidence"/>`;
      reader.readAsDataURL(input.files[0]);
    }
  };

  window.submitChallengeCompletion = async function(challengeId) {
    const fileInput = $('#challengeEvidence');
    const comments = $('#challengeComments')?.value || '';
    
    if (!fileInput.files || !fileInput.files[0]) {
      alert('Please upload photo evidence');
      return;
    }
    
    const formData = new FormData();
    formData.append('photos', fileInput.files[0]);
    
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.urls || !uploadData.urls[0]) {
        alert('Failed to upload evidence');
        return;
      }
      
      const result = await apiCall(`/challenges/${challengeId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ evidence_url: uploadData.urls[0], comments })
      });
      
      if (result && result.success) {
        let msg = `Challenge completed! You earned ${result.points_earned} points.`;
        if (result.badge_earned) msg += ` Badge earned: ${result.badge_earned}`;
        alert(msg);
        closeModal('viewDetailsModal');
        loadChallengesByType(currentChallengeType);
        loadStats();
        const user = await apiCall('/auth/me');
        if (user) {
          currentUser = user;
          $('#userPoints').textContent = user.points;
        }
      } else {
        alert(result?.error || 'Failed to complete challenge');
      }
    } catch (err) {
      alert('Error completing challenge');
    }
  };

  async function startQuiz() {
    if (!currentUser) {
      alert('Please login to take the quiz');
      return;
    }
    
    $('#quizStart').style.display = 'none';
    $('#quizQuestions').style.display = 'block';
    $('#quizQuestions').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading quiz...</div>';
    
    const data = await apiCall('/quiz/questions');
    
    if (data.already_completed) {
      showQuizAlreadyCompleted(data.result);
      return;
    }
    
    if (!data.questions || data.questions.length === 0) {
      $('#quizQuestions').innerHTML = '<div class="no-quiz"><i class="fas fa-info-circle"></i><p>No quiz questions available today. Check back later!</p></div>';
      return;
    }
    
    quizQuestions = data.questions;
    quizAnswers = [];
    currentQuestionIndex = 0;
    renderQuizQuestion();
  }
  window.startQuiz = startQuiz;

  function renderQuizQuestion() {
    const q = quizQuestions[currentQuestionIndex];
    const progress = `${currentQuestionIndex + 1} / ${quizQuestions.length}`;
    
    $('#quizQuestions').innerHTML = `
      <div class="quiz-progress">
        <div class="quiz-progress-bar" style="width: ${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%"></div>
      </div>
      <div class="quiz-progress-text">Question ${progress}</div>
      <div class="quiz-question-card">
        <div class="quiz-category"><i class="fas fa-tag"></i> ${q.category || 'General'}</div>
        <div class="quiz-question-text">${q.question}</div>
        <div class="quiz-options">
          <button class="quiz-option" onclick="selectQuizAnswer('A')"><span class="option-letter">A</span> ${q.option_a}</button>
          <button class="quiz-option" onclick="selectQuizAnswer('B')"><span class="option-letter">B</span> ${q.option_b}</button>
          <button class="quiz-option" onclick="selectQuizAnswer('C')"><span class="option-letter">C</span> ${q.option_c}</button>
          <button class="quiz-option" onclick="selectQuizAnswer('D')"><span class="option-letter">D</span> ${q.option_d}</button>
        </div>
      </div>
    `;
  }

  window.selectQuizAnswer = function(answer) {
    quizAnswers.push({ question_id: quizQuestions[currentQuestionIndex].id, answer });
    
    if (currentQuestionIndex < quizQuestions.length - 1) {
      currentQuestionIndex++;
      renderQuizQuestion();
    } else {
      submitQuiz();
    }
  };

  async function submitQuiz() {
    $('#quizQuestions').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Submitting quiz...</div>';
    
    const result = await apiCall('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ answers: quizAnswers })
    });
    
    if (result && result.success) {
      showQuizResults(result);
      const user = await apiCall('/auth/me');
      if (user) {
        currentUser = user;
        $('#userPoints').textContent = user.points;
      }
    } else {
      alert(result?.error || 'Failed to submit quiz');
      resetQuiz();
    }
  }

  function showQuizResults(result) {
    $('#quizQuestions').style.display = 'none';
    $('#quizResults').style.display = 'block';
    
    const percentage = Math.round((result.score / result.total) * 100);
    const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : percentage >= 40 ? '📚' : '💪';
    
    $('#quizResults').innerHTML = `
      <div class="quiz-results-card">
        <div class="quiz-score-display">
          <div class="quiz-emoji">${emoji}</div>
          <div class="quiz-score">${result.score}/${result.total}</div>
          <div class="quiz-percentage">${percentage}% Correct</div>
          <div class="quiz-points-earned"><i class="fas fa-star"></i> +${result.score} points earned!</div>
        </div>
        <div class="quiz-results-details">
          <h4>Your Answers</h4>
          ${result.results.map((r, i) => `
            <div class="quiz-result-item ${r.is_correct ? 'correct' : 'incorrect'}">
              <div class="result-icon"><i class="fas fa-${r.is_correct ? 'check' : 'times'}-circle"></i></div>
              <div class="result-content">
                <div class="result-answer">Your answer: ${r.user_answer} ${r.is_correct ? '' : `(Correct: ${r.correct_answer})`}</div>
                ${r.explanation ? `<div class="result-explanation">${r.explanation}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <button class="quiz-done-btn" onclick="resetQuiz()"><i class="fas fa-home"></i> Done</button>
      </div>
    `;
  }

  function showQuizAlreadyCompleted(result) {
    $('#quizQuestions').style.display = 'none';
    $('#quizResults').style.display = 'block';
    
    let answers = [];
    try { answers = JSON.parse(result.answers || '[]'); } catch (e) {}
    
    $('#quizResults').innerHTML = `
      <div class="quiz-results-card">
        <div class="quiz-score-display">
          <div class="quiz-emoji">✅</div>
          <div class="quiz-score">${result.score}/${result.total_questions}</div>
          <div class="quiz-percentage">Today's Quiz Completed</div>
        </div>
        <p style="text-align:center;color:var(--text-soft)">Come back tomorrow for new questions!</p>
        <button class="quiz-done-btn" onclick="resetQuiz()"><i class="fas fa-home"></i> Back</button>
      </div>
    `;
  }

  function resetQuiz() {
    quizQuestions = [];
    quizAnswers = [];
    currentQuestionIndex = 0;
    $('#quizStart').style.display = 'block';
    $('#quizQuestions').style.display = 'none';
    $('#quizResults').style.display = 'none';
    loadQuizHistory();
  }
  window.resetQuiz = resetQuiz;

  async function loadQuizHistory() {
    const history = await apiCall('/quiz/history');
    const container = $('#quizHistory');
    if (!container) return;
    
    if (!history || history.length === 0) {
      container.innerHTML = '<p class="quiz-history-empty">No quiz history yet</p>';
      return;
    }
    
    container.innerHTML = `
      <h4>Recent Quizzes</h4>
      <div class="quiz-history-list">
        ${history.slice(0, 5).map(h => `
          <div class="quiz-history-item">
            <span class="quiz-history-date">${h.quiz_date}</span>
            <span class="quiz-history-score">${h.score}/${h.total_questions}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Admin Registry Functions
  let currentRegistryType = '';
  let registryData = [];
  let filteredRegistryData = [];
  let registryPage = 1;
  const registryPageSize = 20;

  const registryConfig = {
    observations: {
      title: 'Observations Registry',
      icon: 'fa-eye',
      columns: ['ID', 'Date', 'Area', 'Type', 'Risk', 'Status', 'Reported By', 'Actions'],
      fields: ['id', 'date', 'area', 'observation_type', 'risk_level', 'status', 'reported_by']
    },
    permits: {
      title: 'Permits Registry',
      icon: 'fa-clipboard-check',
      columns: ['ID', 'Date', 'Area', 'Type', 'Permit #', 'Status', 'Created By', 'Actions'],
      fields: ['id', 'date', 'area', 'permit_type', 'permit_number', 'status', 'created_by']
    },
    equipment: {
      title: 'Equipment Registry',
      icon: 'fa-truck',
      columns: ['ID', 'Asset #', 'Type', 'Owner', 'Yard Area', 'Status', 'TPS Expiry', 'Actions'],
      fields: ['id', 'asset_number', 'equipment_type', 'owner', 'yard_area', 'status', 'tps_expiry']
    },
    toolbox: {
      title: 'Toolbox Talks Registry',
      icon: 'fa-chalkboard-teacher',
      columns: ['ID', 'Date', 'Topic', 'Presenter', 'Area', 'Attendance', 'Actions'],
      fields: ['id', 'date', 'topic', 'presenter', 'area', 'attendance']
    }
  };

  async function openAdminRegistry(type) {
    currentRegistryType = type;
    registryPage = 1;
    const config = registryConfig[type];
    
    $('#registryModalTitle').innerHTML = `<i class="fas ${config.icon}"></i> ${config.title}`;
    $('#registrySearch').value = '';
    
    openModal('adminRegistryModal');
    
    // Load data from admin-only endpoints
    let endpoint = '';
    switch(type) {
      case 'observations': endpoint = '/admin/registry/observations'; break;
      case 'permits': endpoint = '/admin/registry/permits'; break;
      case 'equipment': endpoint = '/admin/registry/equipment'; break;
      case 'toolbox': endpoint = '/admin/registry/toolbox-talks'; break;
    }
    
    const data = await apiCall(endpoint);
    registryData = data || [];
    filteredRegistryData = [...registryData];
    
    renderRegistryTable();
  }
  window.openAdminRegistry = openAdminRegistry;

  function renderRegistryTable() {
    const config = registryConfig[currentRegistryType];
    
    // Render header
    $('#registryTableHead').innerHTML = `
      <tr>${config.columns.map(col => `<th>${col}</th>`).join('')}</tr>
    `;
    
    // Paginate
    const startIdx = (registryPage - 1) * registryPageSize;
    const pageData = filteredRegistryData.slice(startIdx, startIdx + registryPageSize);
    
    if (pageData.length === 0) {
      $('#registryTableBody').innerHTML = `<tr><td colspan="${config.columns.length}" style="text-align:center;padding:2rem;color:var(--text-soft)">No records found</td></tr>`;
      $('#registryPagination').innerHTML = '';
      return;
    }
    
    // Render rows
    $('#registryTableBody').innerHTML = pageData.map(item => {
      const cells = config.fields.map(field => {
        let value = item[field] || '-';
        
        // Format special fields
        if (field === 'status') {
          const statusClass = value.toLowerCase() === 'open' || value.toLowerCase() === 'active' ? 'registry-status-open' : 'registry-status-closed';
          return `<span class="${statusClass}">${value}</span>`;
        }
        if (field === 'risk_level') {
          const riskClass = value.toLowerCase() === 'high' ? 'registry-risk-high' : value.toLowerCase() === 'medium' ? 'registry-risk-medium' : 'registry-risk-low';
          return `<span class="${riskClass}">${value}</span>`;
        }
        return value;
      });
      
      const actions = `
        <div class="registry-actions">
          <button class="registry-view-btn" onclick="viewRegistryItem('${currentRegistryType}', ${item.id})"><i class="fas fa-eye"></i></button>
          <button class="registry-delete-btn" onclick="deleteRegistryItem('${currentRegistryType}', ${item.id})"><i class="fas fa-trash"></i></button>
        </div>
      `;
      
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}<td>${actions}</td></tr>`;
    }).join('');
    
    // Pagination
    const totalPages = Math.ceil(filteredRegistryData.length / registryPageSize);
    if (totalPages > 1) {
      let paginationHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button class="${i === registryPage ? 'active' : ''}" onclick="goToRegistryPage(${i})">${i}</button>`;
      }
      $('#registryPagination').innerHTML = paginationHTML;
    } else {
      $('#registryPagination').innerHTML = '';
    }
  }

  function goToRegistryPage(page) {
    registryPage = page;
    renderRegistryTable();
  }
  window.goToRegistryPage = goToRegistryPage;

  function filterRegistryTable() {
    const search = $('#registrySearch').value.toLowerCase();
    if (!search) {
      filteredRegistryData = [...registryData];
    } else {
      filteredRegistryData = registryData.filter(item => {
        return Object.values(item).some(val => 
          val && String(val).toLowerCase().includes(search)
        );
      });
    }
    registryPage = 1;
    renderRegistryTable();
  }
  window.filterRegistryTable = filterRegistryTable;

  async function viewRegistryItem(type, id) {
    switch(type) {
      case 'observations': window.viewObs(id); break;
      case 'permits': window.viewPermit(id); break;
      case 'equipment': window.viewEquipment(id); break;
      case 'toolbox': window.viewTbt(id); break;
    }
  }
  window.viewRegistryItem = viewRegistryItem;

  async function deleteRegistryItem(type, id) {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    
    let endpoint = '';
    switch(type) {
      case 'observations': endpoint = `/observations/${id}`; break;
      case 'permits': endpoint = `/permits/${id}`; break;
      case 'equipment': endpoint = `/equipment/${id}`; break;
      case 'toolbox': endpoint = `/toolbox-talks/${id}`; break;
    }
    
    try {
      await apiCall(endpoint, 'DELETE');
      showToast('Record deleted successfully', 'success');
      // Refresh data
      openAdminRegistry(type);
    } catch (err) {
      showToast('Failed to delete record', 'error');
    }
  }
  window.deleteRegistryItem = deleteRegistryItem;

  function exportRegistryCSV() {
    if (filteredRegistryData.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    
    const config = registryConfig[currentRegistryType];
    const headers = config.fields;
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    filteredRegistryData.forEach(item => {
      const row = headers.map(field => {
        let val = item[field] || '';
        // Escape quotes and wrap in quotes if contains comma
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      });
      csv += row.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentRegistryType}_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('CSV exported successfully', 'success');
  }
  window.exportRegistryCSV = exportRegistryCSV;

  // Dropdown Settings Management
  const dropdownSettingsConfig = {
    observations: {
      title: 'Observation Settings',
      tabs: [
        { key: 'areas', label: 'Areas', endpoint: '/api/areas/all', addEndpoint: '/api/areas', deleteEndpoint: '/api/areas' },
        { key: 'activity_types', label: 'Activity Types', endpoint: '/api/settings/activity_types', addEndpoint: '/api/settings/activity_types', deleteEndpoint: '/api/settings/activity_types' },
        { key: 'observation_types', label: 'Observation Types', endpoint: '/api/settings/observation_types', addEndpoint: '/api/settings/observation_types', deleteEndpoint: '/api/settings/observation_types' },
        { key: 'direct_causes', label: 'Direct Causes', endpoint: '/api/settings/direct_causes', addEndpoint: '/api/settings/direct_causes', deleteEndpoint: '/api/settings/direct_causes' },
        { key: 'root_causes', label: 'Root Causes', endpoint: '/api/settings/root_causes', addEndpoint: '/api/settings/root_causes', deleteEndpoint: '/api/settings/root_causes' }
      ]
    },
    permits: {
      title: 'Permit Settings',
      tabs: [
        { key: 'permit_types', label: 'Permit Types', endpoint: '/api/settings/permit_types', addEndpoint: '/api/settings/permit_types', deleteEndpoint: '/api/settings/permit_types' }
      ]
    },
    equipment: {
      title: 'Equipment Settings',
      tabs: [
        { key: 'equipment_types', label: 'Equipment Types', endpoint: '/api/settings/equipment_types', addEndpoint: '/api/settings/equipment_types', deleteEndpoint: '/api/settings/equipment_types' },
        { key: 'yard_areas', label: 'Yard Areas', endpoint: '/api/settings/yard_areas', addEndpoint: '/api/settings/yard_areas', deleteEndpoint: '/api/settings/yard_areas' }
      ]
    },
    tbt: {
      title: 'Toolbox Talk Settings',
      tabs: [
        { key: 'tbt_topics', label: 'Topics', endpoint: '/api/settings/tbt_topics', addEndpoint: '/api/settings/tbt_topics', deleteEndpoint: '/api/settings/tbt_topics' }
      ]
    }
  };

  let currentSettingsType = null;
  let currentSettingsTab = null;

  async function openDropdownSettings(type) {
    currentSettingsType = type;
    const config = dropdownSettingsConfig[type];
    if (!config) return;

    document.getElementById('dropdownSettingsTitle').innerHTML = `<i class="fas fa-cogs"></i> ${config.title}`;
    
    // Build tabs
    const tabsContainer = document.getElementById('settingsTabsContainer');
    tabsContainer.innerHTML = config.tabs.map((tab, idx) => 
      `<button class="settings-tab-btn ${idx === 0 ? 'active' : ''}" onclick="switchSettingsTab('${tab.key}')">${tab.label}</button>`
    ).join('');

    // Load first tab
    currentSettingsTab = config.tabs[0].key;
    await loadSettingsItems();
    openModal('dropdownSettingsModal');
  }
  window.openDropdownSettings = openDropdownSettings;

  async function switchSettingsTab(tabKey) {
    currentSettingsTab = tabKey;
    document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.settings-tab-btn[onclick*="${tabKey}"]`).classList.add('active');
    document.getElementById('newSettingItemInput').value = '';
    await loadSettingsItems();
  }
  window.switchSettingsTab = switchSettingsTab;

  function getCurrentTabConfig() {
    const config = dropdownSettingsConfig[currentSettingsType];
    return config?.tabs.find(t => t.key === currentSettingsTab);
  }

  async function loadSettingsItems() {
    const tabConfig = getCurrentTabConfig();
    if (!tabConfig) return;

    const listEl = document.getElementById('settingsItemsList');
    listEl.innerHTML = '<div class="settings-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
      const res = await fetch(tabConfig.endpoint);
      const items = await res.json();

      if (!items.length) {
        listEl.innerHTML = '<div class="settings-empty">No items found. Add one above.</div>';
        return;
      }

      listEl.innerHTML = items.map(item => {
        const escapedName = item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `
        <div class="settings-item" id="settings-item-${item.id}" data-name="${escapedName}">
          <span class="settings-item-name">${escapedName}</span>
          <div class="settings-item-actions">
            <button class="settings-item-edit" onclick="editSettingItem(${item.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="settings-item-delete" onclick="deleteSettingItem(${item.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = '<div class="settings-empty">Error loading items</div>';
    }
  }

  async function addSettingItem() {
    const input = document.getElementById('newSettingItemInput');
    const name = input.value.trim();
    if (!name) {
      showToast('Please enter a name', 'error');
      return;
    }

    const tabConfig = getCurrentTabConfig();
    if (!tabConfig) return;

    try {
      const res = await fetch(tabConfig.addEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ name })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to add item', 'error');
        return;
      }

      showToast('Item added successfully', 'success');
      input.value = '';
      await loadSettingsItems();
    } catch (err) {
      showToast('Error adding item', 'error');
    }
  }
  window.addSettingItem = addSettingItem;

  async function deleteSettingItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const tabConfig = getCurrentTabConfig();
    if (!tabConfig) return;

    try {
      const res = await fetch(`${tabConfig.deleteEndpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete item', 'error');
        return;
      }

      showToast('Item deleted successfully', 'success');
      await loadSettingsItems();
    } catch (err) {
      showToast('Error deleting item', 'error');
    }
  }
  window.deleteSettingItem = deleteSettingItem;

  function editSettingItem(id) {
    const itemEl = document.getElementById(`settings-item-${id}`);
    if (!itemEl) return;
    
    const currentName = itemEl.dataset.name || '';
    
    itemEl.innerHTML = `
      <input type="text" class="settings-edit-input" id="edit-input-${id}" />
      <div class="settings-item-actions">
        <button class="settings-item-save" onclick="saveSettingItem(${id})">
          <i class="fas fa-check"></i> Save
        </button>
        <button class="settings-item-cancel" onclick="loadSettingsItems()">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    `;
    const inputEl = document.getElementById(`edit-input-${id}`);
    inputEl.value = currentName;
    inputEl.focus();
  }
  window.editSettingItem = editSettingItem;

  async function saveSettingItem(id) {
    const input = document.getElementById(`edit-input-${id}`);
    const newName = input?.value.trim();
    if (!newName) {
      showToast('Please enter a name', 'error');
      return;
    }

    const tabConfig = getCurrentTabConfig();
    if (!tabConfig) return;

    try {
      const res = await fetch(`${tabConfig.deleteEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ name: newName })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update item', 'error');
        return;
      }

      showToast('Item updated successfully', 'success');
      await loadSettingsItems();
    } catch (err) {
      showToast('Error updating item', 'error');
    }
  }
  window.saveSettingItem = saveSettingItem;

  async function loadVerificationQueue() {
    const list = $('#verificationList');
    if (!list) return;
    
    list.innerHTML = '<p style="text-align:center;color:var(--text-soft)"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    
    try {
      const pending = await apiCall('/verifications/pending');
      if (!pending || pending.error) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">Access denied or no pending items</p>';
        return;
      }
      
      $('#pendingVerificationCount').textContent = pending.length;
      
      if (pending.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-soft)"><i class="fas fa-check-circle"></i> No items pending verification</p>';
        return;
      }
      
      list.innerHTML = pending.map(o => {
        let evidenceThumb = '';
        try {
          const urls = JSON.parse(o.close_evidence_urls || o.evidence_urls || '[]');
          if (urls.length > 0) {
            evidenceThumb = `<img src="${urls[0]}" class="verification-thumb" alt="Evidence"/>`;
          }
        } catch(e) {}
        
        const riskClass = o.risk_level === 'High' ? 'badge-high' : o.risk_level === 'Low' ? 'badge-low' : 'badge-medium';
        
        return `
          <div class="verification-card" onclick="openVerificationDetail(${o.id})">
            <div class="verification-card-left">
              ${evidenceThumb || '<div class="verification-thumb-placeholder"><i class="fas fa-image"></i></div>'}
            </div>
            <div class="verification-card-right">
              <div class="verification-card-header">
                <span class="verification-id">#${o.id}</span>
                <span class="badge ${riskClass}">${o.risk_level || 'Medium'}</span>
              </div>
              <div class="verification-card-area">${o.area || 'Unknown Area'}</div>
              <div class="verification-card-date">${o.date || ''}</div>
              <div class="verification-card-assignee">
                <i class="fas fa-user"></i> ${o.corrective_action_assigned_to || o.reported_by || 'Unassigned'}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">Error loading verification queue</p>';
    }
  }
  window.loadVerificationQueue = loadVerificationQueue;

  async function openVerificationDetail(id) {
    const obs = await apiCall(`/observations/${id}`);
    if (!obs) return;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(obs.evidence_urls || '[]'); } catch(e) {}
    let closeEvidenceUrls = [];
    try { closeEvidenceUrls = JSON.parse(obs.close_evidence_urls || '[]'); } catch(e) {}
    
    const riskClass = obs.risk_level === 'High' ? 'detail-risk-high' : obs.risk_level === 'Low' ? 'detail-risk-low' : 'detail-risk-medium';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-info-circle"></i> Observation Details</div>
        <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value">#${obs.id}</span></div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${obs.date || ''} ${obs.time || ''}</span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${obs.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${obs.location || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Risk Level</span><span class="detail-value"><span class="detail-status-badge ${riskClass}">${obs.risk_level || 'Medium'}</span></span></div>
        <div class="detail-full-row"><span class="detail-label">Description</span><div class="detail-value">${obs.description || '-'}</div></div>
      </div>
      
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-tasks"></i> Corrective Action</div>
        <div class="detail-full-row"><span class="detail-label">Action Taken</span><div class="detail-value">${obs.corrective_action || '-'}</div></div>
        <div class="detail-row"><span class="detail-label">Assigned To</span><span class="detail-value">${obs.corrective_action_assigned_to || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Due Date</span><span class="detail-value">${obs.corrective_action_due_date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${obs.corrective_action_status || '-'}</span></div>
      </div>
    `;
    
    if (evidenceUrls.length > 0) {
      html += `
        <div class="detail-section">
          <div class="detail-section-title"><i class="fas fa-camera"></i> Before Photos (Original Evidence)</div>
          <div class="evidence-gallery">${evidenceUrls.map(u => `<img src="${convertDriveUrl(u)}" data-original-url="${u}" class="evidence-img" onclick="openImageViewer('${u}')" onerror="handleImageError(this)"/>`).join('')}</div>
        </div>
      `;
    }
    
    if (closeEvidenceUrls.length > 0) {
      html += `
        <div class="detail-section">
          <div class="detail-section-title"><i class="fas fa-check-circle"></i> After Photos (Closure Evidence)</div>
          <div class="evidence-gallery">${closeEvidenceUrls.map(u => `<img src="${convertDriveUrl(u)}" data-original-url="${u}" class="evidence-img" onclick="openImageViewer('${u}')" onerror="handleImageError(this)"/>`).join('')}</div>
        </div>
      `;
    }
    
    html += `
      <div class="detail-section verification-action-section">
        <div class="detail-section-title"><i class="fas fa-clipboard-check"></i> Verification Decision</div>
        <div class="form-group">
          <label>Remarks (Required)</label>
          <textarea id="verificationRemarks" rows="3" placeholder="Enter your remarks for this verification..." required></textarea>
        </div>
        <div class="verification-buttons">
          <button class="verify-btn approve-btn" onclick="approveObservation(${obs.id})">
            <i class="fas fa-check"></i> Approve & Close
          </button>
          <button class="verify-btn reject-btn" onclick="rejectObservation(${obs.id})">
            <i class="fas fa-times"></i> Reject & Return
          </button>
        </div>
      </div>
    `;
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-clipboard-check"></i> Verification Review';
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  }
  window.openVerificationDetail = openVerificationDetail;

  async function approveObservation(id) {
    const remarks = $('#verificationRemarks')?.value?.trim();
    if (!remarks) {
      showToast('Please enter remarks before approving', 'error');
      return;
    }
    
    if (!confirm('Are you sure you want to APPROVE and CLOSE this observation?')) return;
    
    const result = await apiCall(`/verifications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ remarks })
    });
    
    if (result && result.success) {
      showToast('Observation approved and closed successfully', 'success');
      closeModal('viewDetailsModal');
      loadVerificationQueue();
      updateVerificationBadge();
    } else {
      showToast(result?.error || 'Failed to approve observation', 'error');
    }
  }
  window.approveObservation = approveObservation;

  async function rejectObservation(id) {
    const remarks = $('#verificationRemarks')?.value?.trim();
    if (!remarks) {
      showToast('Please enter remarks explaining the rejection', 'error');
      return;
    }
    
    if (!confirm('Are you sure you want to REJECT and RETURN this observation for correction?')) return;
    
    const result = await apiCall(`/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ remarks })
    });
    
    if (result && result.success) {
      showToast('Observation rejected and returned for correction', 'success');
      closeModal('viewDetailsModal');
      loadVerificationQueue();
      updateVerificationBadge();
    } else {
      showToast(result?.error || 'Failed to reject observation', 'error');
    }
  }
  window.rejectObservation = rejectObservation;

  async function updateVerificationBadge() {
    try {
      const result = await apiCall('/verifications/pending/count');
      if (result && typeof result.count === 'number') {
        const badge = $('#verificationBadge');
        if (badge) {
          badge.textContent = result.count > 0 ? result.count : '';
          badge.style.display = result.count > 0 ? 'inline-block' : 'none';
        }
      }
    } catch (e) {}
  }

  function handlePhotoCapture(captureInput, targetInputId) {
    const targetInput = document.getElementById(targetInputId);
    if (!targetInput || !captureInput.files.length) return;
    
    const dt = new DataTransfer();
    if (targetInput.files) {
      for (const file of targetInput.files) dt.items.add(file);
    }
    dt.items.add(captureInput.files[0]);
    targetInput.files = dt.files;
    
    previewPhotos(targetInput, targetInputId.replace('Photos', 'PhotoPreview').replace('photos', 'PhotoPreview'));
    captureInput.value = '';
  }
  window.handlePhotoCapture = handlePhotoCapture;

  function previewPhotos(input, previewContainerId) {
    const container = document.getElementById(previewContainerId);
    if (!container) return;
    
    container.innerHTML = '';
    if (!input.files || !input.files.length) return;
    
    Array.from(input.files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'photo-preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="Photo ${idx + 1}"/>
          <button type="button" class="photo-preview-remove" onclick="removePhoto('${input.id}', ${idx}, '${previewContainerId}')"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }
  window.previewPhotos = previewPhotos;

  function removePhoto(inputId, idx, previewContainerId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files) return;
    
    const dt = new DataTransfer();
    Array.from(input.files).forEach((file, i) => {
      if (i !== idx) dt.items.add(file);
    });
    input.files = dt.files;
    previewPhotos(input, previewContainerId);
  }
  window.removePhoto = removePhoto;

  function showVerificationMenuIfAllowed() {
    if (currentUser && ['admin', 'safety_officer', 'hse'].includes(currentUser.role)) {
      const btn = $('#verificationMenuBtn');
      if (btn) btn.style.display = 'flex';
      updateVerificationBadge();
    }
  }

  const originalInit = init;
  init = async function() {
    await originalInit.call(this);
    showVerificationMenuIfAllowed();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
