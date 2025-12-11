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
    tbtArea: '',
    tbtSearch: '',
    areasCollapsed: {
      permit: false,
      obs: false,
      eq: false,
      tbt: false
    }
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

  function printProfessionalPDF(options) {
    const {
      title = 'Report',
      content = '',
      extraStyles = '',
      showUserInfo = true
    } = options;

    const user = currentUser || {};
    const userName = user.name || 'Unknown User';
    const userId = user.employee_id || '-';
    const printDate = new Date().toLocaleString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Safety Observer</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { margin: 15mm; }
          body { 
            font-family: 'Segoe UI', 'Arial', sans-serif; 
            padding: 0; 
            color: #1e293b; 
            line-height: 1.5;
            font-size: 12px;
          }
          .print-container { max-width: 100%; margin: 0 auto; }
          .print-header { 
            display: flex; 
            align-items: center; 
            gap: 15px; 
            border-bottom: 3px solid #0369a1; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .print-logo { 
            width: 70px; 
            height: 70px; 
            border-radius: 8px; 
            object-fit: cover;
            border: 1px solid #e2e8f0;
          }
          .print-title-area { flex: 1; }
          .print-title-area h1 { 
            font-size: 22px; 
            color: #0369a1; 
            margin-bottom: 4px; 
            font-weight: 700;
          }
          .print-title-area p { 
            font-size: 12px; 
            color: #64748b; 
            margin: 0;
          }
          .print-user-info {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          .print-user-info .user-name { font-weight: 600; color: #1e293b; }
          .print-doc-title { 
            font-size: 16px; 
            font-weight: 700; 
            color: #1e293b; 
            margin-bottom: 20px; 
            padding: 12px 15px; 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            border-radius: 8px;
            border-left: 4px solid #0369a1;
          }
          .print-content {
            margin-bottom: 30px;
          }
          .print-footer { 
            margin-top: 30px; 
            padding-top: 15px; 
            border-top: 2px solid #e2e8f0; 
            font-size: 10px; 
            color: #94a3b8; 
            text-align: center;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .print-footer-left { text-align: left; }
          .print-footer-right { text-align: right; }

          /* Common content styles */
          .detail-section { margin-bottom: 15px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; }
          .detail-section-title { font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 10px; }
          .detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #475569; }
          .detail-value { color: #1e293b; }
          .detail-full-row { padding: 8px 0; font-size: 12px; }
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
          .ca-status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .ca-notstarted { background: #e2e8f0; color: #64748b; }
          .ca-inprogress { background: #dbeafe; color: #2563eb; }
          .ca-completed { background: #dcfce7; color: #16a34a; }
          .ca-actions, .ca-update-form { display: none !important; }

          /* Daily Report Styles */
          .dr-view-section { margin-bottom: 15px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .dr-section-title { font-weight: bold; margin-bottom: 8px; color: #0369a1; }
          .dr-view-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .dr-label { color: #6b7280; }
          .dr-stats-row { display: flex; gap: 20px; margin-top: 8px; }
          .dr-stat-box { text-align: center; padding: 10px 15px; background: #f3f4f6; border-radius: 6px; }
          .stat-num { font-size: 22px; font-weight: bold; display: block; color: #1e293b; }
          .stat-txt { font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .dr-stat-box.cat { background: #dbeafe; }
          .dr-stat-box.cat .stat-num { color: #2563eb; }
          .dr-stat-box.rental { background: #fef3c7; }
          .dr-stat-box.rental .stat-num { color: #d97706; }
          .dr-equip-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
          .dr-equip-item { display: flex; justify-content: space-between; padding: 6px 10px; background: #f9fafb; border-radius: 4px; }
          .eq-qty { font-weight: bold; }
          .dr-view-footer { font-size: 11px; color: #9ca3af; margin-top: 15px; text-align: right; }

          /* Table Styles */
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #0369a1; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 11px; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
          tr:nth-child(even) { background: #f9fafb; }

          /* Totals */
          .totals { background: #f0f9ff; padding: 15px; border-radius: 8px; display: flex; justify-content: space-around; margin-top: 20px; }
          .total-item { text-align: center; }
          .total-value { font-size: 20px; font-weight: bold; color: #0369a1; }
          .total-label { font-size: 10px; color: #6b7280; text-transform: uppercase; }

          ${extraStyles}

          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-container { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <img src="${window.location.origin}/img/CAT.jpeg" class="print-logo" alt="Safety Observer Logo"/>
            <div class="print-title-area">
              <h1>Safety Observer</h1>
              <p>Saudi Safety Group - Aramco CAT Project</p>
            </div>
            ${showUserInfo ? `
            <div class="print-user-info">
              <div class="user-name">${userName}</div>
              <div>ID: ${userId}</div>
              <div>${printDate}</div>
            </div>
            ` : ''}
          </div>
          <div class="print-doc-title">${title}</div>
          <div class="print-content">
            ${content}
          </div>
          <div class="print-footer">
            <div class="print-footer-left">Safety Observer v3.0.0</div>
            <div class="print-footer-center">© 2025 Saudi Safety Group. All Rights Reserved.</div>
            <div class="print-footer-right">Page 1</div>
          </div>
        </div>
        <script>
          window.onload = function() { 
            setTimeout(function() { window.print(); }, 300); 
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
  window.printProfessionalPDF = printProfessionalPDF;

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
    result.textContent = 'Getting precise location...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;
        result.innerHTML = `<strong>Location:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br><small>Accuracy: ${accuracy.toFixed(0)}m</small><br><a href="${link}" target="_blank">Open in Google Maps</a>`;
      },
      err => { result.textContent = 'Unable to get location: ' + err.message; },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }
  window.getGPSLocation = getGPSLocation;

  function toggleSafetyResponsibilities() {
    const fullSection = document.getElementById('responsibilitiesFull');
    const toggleIcon = document.getElementById('respToggleIcon');
    if (fullSection && toggleIcon) {
      const isHidden = fullSection.style.display === 'none';
      fullSection.style.display = isHidden ? 'block' : 'none';
      toggleIcon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
  }
  window.toggleSafetyResponsibilities = toggleSafetyResponsibilities;

  function openDocViewer(title, url) {
    const titleEl = document.getElementById('docViewerTitle');
    const frame = document.getElementById('docViewerFrame');
    const extLink = document.getElementById('docViewerExternal');
    
    if (titleEl) titleEl.textContent = title;
    if (frame) frame.src = url;
    if (extLink) extLink.href = url.replace('/preview', '/view');
    
    openModal('docViewerModal');
  }
  window.openDocViewer = openDocViewer;

  function showResponsibilitySection(type) {
    const fullSection = document.getElementById('responsibilitiesFull');
    const toggleIcon = document.getElementById('respToggleIcon');
    
    if (fullSection) {
      fullSection.style.display = 'block';
      if (toggleIcon) toggleIcon.className = 'fas fa-chevron-up';
      
      const sections = fullSection.querySelectorAll('.resp-section');
      sections.forEach(s => s.style.display = 'none');
      
      const sectionMap = {
        'reporting': 0,
        'monitoring': 1,
        'compliance': 2
      };
      
      const idx = sectionMap[type];
      if (sections[idx]) {
        sections[idx].style.display = 'block';
        sections[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
  window.showResponsibilitySection = showResponsibilitySection;

  const riskCalcState = { likelihood: null, consequence: null };
  const RISK_MATRIX = [
    [null, 1, 2, 3, 4, 5],
    [5, 'M', 'H', 'H', 'E', 'E'],
    [4, 'M', 'M', 'H', 'H', 'E'],
    [3, 'L', 'M', 'M', 'H', 'H'],
    [2, 'L', 'L', 'M', 'M', 'H'],
    [1, 'L', 'L', 'L', 'M', 'M']
  ];
  const RISK_LABELS = {
    'L': { name: 'Low', class: 'low', action: 'Acceptable risk. Monitor and maintain controls.' },
    'M': { name: 'Medium', class: 'medium', action: 'Requires additional controls. Implement mitigation measures.' },
    'H': { name: 'High', class: 'high', action: 'Significant controls needed. Senior management approval required.' },
    'E': { name: 'Extreme', class: 'extreme', action: 'Unacceptable risk! Immediate action required. Stop work until mitigated.' }
  };

  function selectRiskOption(type, value, btn) {
    const container = btn.closest('.risk-options');
    container.querySelectorAll('.risk-option').forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
    riskCalcState[type] = value;
    
    document.querySelectorAll('.matrix-cell').forEach(cell => cell.classList.remove('highlighted'));
    
    if (riskCalcState.likelihood && riskCalcState.consequence) {
      calculateRisk();
    }
  }
  window.selectRiskOption = selectRiskOption;

  function calculateRisk() {
    const l = riskCalcState.likelihood;
    const c = riskCalcState.consequence;
    const rowIndex = 6 - l;
    const riskLevel = RISK_MATRIX[rowIndex][c];
    const riskInfo = RISK_LABELS[riskLevel];
    const score = l * c;
    
    const cell = document.querySelector(`.matrix-cell[data-l="${l}"][data-c="${c}"]`);
    if (cell) cell.classList.add('highlighted');
    
    const resultDisplay = document.getElementById('riskResultDisplay');
    resultDisplay.innerHTML = `
      <div class="risk-result-card">
        <div class="risk-result-header">
          <div class="risk-level-badge ${riskInfo.class}">${riskInfo.name} Risk</div>
          <div class="risk-score-display">
            <span class="risk-score-label">Risk Score</span>
            <span class="risk-score-value">${score}</span>
          </div>
        </div>
        <div class="risk-action-required ${riskInfo.class}">
          <i class="fas fa-clipboard-check"></i> ${riskInfo.action}
        </div>
      </div>
    `;
  }

  function setMonthColor() {
    const month = new Date().getMonth();
    const color = MONTH_COLORS[month] || 'White';
    const el = $('#colorName');
    if (el) {
      el.textContent = color;
      el.className = 'month-color-badge color-' + color.toLowerCase();
    }
    highlightCurrentMonthInSchedule(month);
  }
  
  function highlightCurrentMonthInSchedule(month) {
    const cards = document.querySelectorAll('.color-month-card');
    cards.forEach((card, idx) => {
      card.classList.remove('current-month');
      if (idx === month) {
        card.classList.add('current-month');
      }
    });
  }
  
  function openColorScheduleModal() {
    const modal = document.getElementById('colorScheduleModal');
    if (modal) {
      modal.classList.add('active');
      highlightCurrentMonthInSchedule(new Date().getMonth());
    }
  }
  
  function closeColorScheduleModal() {
    const modal = document.getElementById('colorScheduleModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    const colorSection = document.getElementById('colorCodeSection');
    if (colorSection) {
      colorSection.addEventListener('click', openColorScheduleModal);
    }
    
    const closeBtn = document.getElementById('closeColorScheduleBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closeColorScheduleModal();
      });
    }
    
    const modal = document.getElementById('colorScheduleModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeColorScheduleModal();
        }
      });
    }
  });

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
    
    if (heatIndexC < 27 || tempC < 27) return { 
      level: 'safe', 
      title: 'Safe Conditions', 
      desc: 'Normal operations. Stay hydrated.', 
      icon: 'fa-thermometer-quarter',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
      workRest: 'Normal operations',
      hydration: 'Regular hydration',
      symptoms: ['None expected under normal conditions'],
      actions: ['Maintain regular hydration', 'Continue normal work schedule']
    };
    if (heatIndexC < 32) return { 
      level: 'caution', 
      title: 'Caution', 
      desc: 'Fatigue possible. Take regular breaks.', 
      icon: 'fa-thermometer-half',
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.15)',
      workRest: '45 min work / 15 min rest',
      hydration: '1 cup every 20 minutes',
      symptoms: ['Fatigue', 'Heavy sweating', 'Thirst'],
      actions: ['Increase water intake', 'Monitor for fatigue signs', 'Take breaks in shade']
    };
    if (heatIndexC < 38) return { 
      level: 'warning', 
      title: 'Extreme Caution', 
      desc: 'Heat cramps/exhaustion possible.', 
      icon: 'fa-thermometer-three-quarters',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)',
      workRest: '30 min work / 15 min rest',
      hydration: '1 cup every 15 minutes',
      symptoms: ['Heat cramps', 'Heat exhaustion', 'Dizziness', 'Nausea'],
      actions: ['Mandatory rest breaks', 'Buddy system required', 'Move to shade if symptomatic', 'Increase hydration']
    };
    if (heatIndexC < 41) return { 
      level: 'danger', 
      title: 'Danger', 
      desc: 'Heat cramps/exhaustion likely. Heat stroke possible.', 
      icon: 'fa-thermometer-three-quarters',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      workRest: '20 min work / 20 min rest',
      hydration: '1 cup every 10 minutes',
      symptoms: ['Heat exhaustion likely', 'Heat stroke possible', 'Confusion', 'Hot dry skin'],
      actions: ['Limit heavy physical work', 'Continuous monitoring', 'Emergency response on standby', 'Seek air-conditioned areas']
    };
    return { 
      level: 'extreme', 
      title: 'Extreme Danger', 
      desc: 'Heat stroke highly likely. Stop outdoor work.', 
      icon: 'fa-thermometer-full',
      color: '#dc2626',
      bgColor: 'rgba(220, 38, 38, 0.2)',
      workRest: 'STOP outdoor work',
      hydration: 'Maximum hydration',
      symptoms: ['Heat stroke imminent', 'Loss of consciousness', 'Seizures', 'Organ damage risk'],
      actions: ['STOP all non-essential outdoor work', 'Emergency protocols active', 'Immediate medical attention if symptomatic', 'Evacuate to cooled areas']
    };
  }
  
  let currentHeatStressData = null;
  
  function showHeatStressDetails() {
    if (!currentHeatStressData) return;
    const hs = currentHeatStressData;
    
    const modal = document.createElement('div');
    modal.className = 'heat-details-modal';
    modal.innerHTML = `
      <div class="heat-details-overlay" onclick="closeHeatDetailsModal()"></div>
      <div class="heat-details-content">
        <button class="heat-details-close" onclick="closeHeatDetailsModal()"><i class="fas fa-times"></i></button>
        <div class="heat-details-header" style="background: ${hs.bgColor}; border-left: 4px solid ${hs.color};">
          <i class="fas ${hs.icon}" style="color: ${hs.color}; font-size: 2rem;"></i>
          <div>
            <h3 style="color: ${hs.color};">${hs.title}</h3>
            <p>${hs.desc}</p>
          </div>
        </div>
        
        <div class="heat-details-section">
          <h4><i class="fas fa-clock"></i> Work/Rest Schedule</h4>
          <div class="heat-info-card">
            <span class="heat-info-value">${hs.workRest}</span>
          </div>
        </div>
        
        <div class="heat-details-section">
          <h4><i class="fas fa-tint"></i> Hydration Requirements</h4>
          <div class="heat-info-card">
            <span class="heat-info-value">${hs.hydration}</span>
          </div>
        </div>
        
        <div class="heat-details-section">
          <h4><i class="fas fa-exclamation-triangle"></i> Possible Symptoms</h4>
          <div class="heat-symptoms-grid">
            ${hs.symptoms.map(s => `<span class="heat-symptom-tag"><i class="fas fa-circle"></i> ${s}</span>`).join('')}
          </div>
        </div>
        
        <div class="heat-details-section">
          <h4><i class="fas fa-shield-alt"></i> Required Actions</h4>
          <ul class="heat-actions-list">
            ${hs.actions.map(a => `<li><i class="fas fa-check-circle" style="color: ${hs.color};"></i> ${a}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }
  window.showHeatStressDetails = showHeatStressDetails;
  
  function closeHeatDetailsModal() {
    const modal = document.querySelector('.heat-details-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }
  window.closeHeatDetailsModal = closeHeatDetailsModal;

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
      currentHeatStressData = heatStress;
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
        <div class="heat-stress-box level-${heatStress.level}" style="background: ${heatStress.bgColor}; border-left: 4px solid ${heatStress.color};">
          <i class="fas ${heatStress.icon} heat-stress-icon" style="color: ${heatStress.color};"></i>
          <div class="heat-stress-details">
            <div class="heat-stress-title" style="color: ${heatStress.color};">${heatStress.title}</div>
            <div class="heat-stress-desc">${heatStress.desc}</div>
          </div>
        </div>
        <div class="weather-schedule-row">
          <div class="weather-schedule-item">
            <i class="fas fa-clock" style="color: ${heatStress.color};"></i>
            <span><strong>Work/Rest:</strong> ${heatStress.workRest}</span>
          </div>
          <div class="weather-schedule-item">
            <i class="fas fa-tint" style="color: #0ea5e9;"></i>
            <span><strong>Hydration:</strong> ${heatStress.hydration}</span>
          </div>
        </div>
        <button class="view-heat-details-btn" onclick="showHeatStressDetails()" style="background: ${heatStress.bgColor}; color: ${heatStress.color}; border: 1px solid ${heatStress.color};">
          <i class="fas fa-info-circle"></i> View Details
        </button>
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
        return `<div class="leaderboard-mini-item clickable" onclick="viewUserProfile(${u.id})">
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
        return `<div class="leaderboard-row clickable" onclick="viewUserProfile(${u.id})">
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
    await loadObsAreaBoxes();
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
    printProfessionalPDF({
      title: title,
      content: content,
      showUserInfo: true
    });
  };

  async function loadAreas() {
    const obsAreas = await apiCall('/observations/areas');
    const permitAreas = await apiCall('/settings/permit_areas');
    const permitTypes = await apiCall('/permits/types');
    const eqAreas = await apiCall('/equipment/areas');
    if (obsAreas) {
      const sel = $('#obsFilterArea');
      if (sel) obsAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
    if (permitAreas) {
      const sel = $('#permitsFilterArea');
      if (sel) permitAreas.forEach(a => sel.innerHTML += `<option value="${a.name}">${a.name}</option>`);
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

  async function loadPermitAreaBoxes() {
    const params = new URLSearchParams();
    if (state.permitsRange !== 'all') params.append('range', state.permitsRange);
    const areaCounts = await apiCall(`/permits/area-counts?${params}`);
    const grid = $('#permitAreasGrid');
    if (!grid || !areaCounts) return;
    
    const header = grid.querySelector('.permit-areas-header');
    grid.innerHTML = '';
    if (header) grid.appendChild(header);
    
    if (areaCounts.length === 0) {
      grid.innerHTML += '<p style="grid-column:1/-1;text-align:center;color:var(--text-soft);font-size:.8rem;padding:.5rem;">No areas found</p>';
      return;
    }
    
    areaCounts.forEach(item => {
      const hasPermits = item.count > 0;
      const colorClass = hasPermits ? 'area-green' : 'area-red';
      const activeClass = state.permitsArea === item.area ? 'area-active' : '';
      
      const box = document.createElement('div');
      box.className = `permit-area-box ${colorClass} ${activeClass}`;
      box.dataset.area = item.area;
      box.innerHTML = `
        <span class="permit-area-name">${item.area}</span>
        <span class="permit-area-count">${item.count}</span>
      `;
      box.addEventListener('click', () => handleAreaBoxClick(item.area));
      grid.appendChild(box);
    });
    
    const clearBtn = $('#clearAreaFilter');
    if (clearBtn) {
      clearBtn.style.display = state.permitsArea ? 'block' : 'none';
    }
  }

  function handleAreaBoxClick(area) {
    if (state.permitsArea === area) {
      state.permitsArea = '';
      $('#permitsFilterArea').value = '';
    } else {
      state.permitsArea = area;
      $('#permitsFilterArea').value = area;
    }
    loadPermits();
  }

  function setupAreaBoxClear() {
    const clearBtn = $('#clearAreaFilter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.permitsArea = '';
        $('#permitsFilterArea').value = '';
        loadPermits();
      });
    }
  }

  function toggleAreasGrid(type) {
    const toggle = $(`#${type}AreasToggle`);
    const content = $(`#${type}AreasGrid`);
    if (!toggle || !content) return;
    
    state.areasCollapsed[type] = !state.areasCollapsed[type];
    
    if (state.areasCollapsed[type]) {
      toggle.classList.add('collapsed');
      content.classList.add('collapsed');
    } else {
      toggle.classList.remove('collapsed');
      content.classList.remove('collapsed');
    }
  }
  window.toggleAreasGrid = toggleAreasGrid;

  function clearPermitAreaFilter() {
    state.permitsArea = '';
    if ($('#permitsFilterArea')) $('#permitsFilterArea').value = '';
    loadPermits();
  }
  window.clearPermitAreaFilter = clearPermitAreaFilter;

  function clearObsAreaFilter() {
    state.obsArea = '';
    if ($('#obsFilterArea')) $('#obsFilterArea').value = '';
    loadObservations();
  }
  window.clearObsAreaFilter = clearObsAreaFilter;

  function clearEqAreaFilter() {
    state.eqArea = '';
    if ($('#eqFilterArea')) $('#eqFilterArea').value = '';
    loadEquipment();
  }
  window.clearEqAreaFilter = clearEqAreaFilter;

  function clearTbtAreaFilter() {
    state.tbtArea = '';
    if ($('#tbtFilterArea')) $('#tbtFilterArea').value = '';
    loadTbt();
  }
  window.clearTbtAreaFilter = clearTbtAreaFilter;

  async function loadObsAreaBoxes() {
    const params = new URLSearchParams();
    if (state.obsRange !== 'all') params.append('range', state.obsRange);
    const areaCounts = await apiCall(`/observations/area-counts?${params}`);
    const grid = $('#obsAreasGrid');
    if (!grid || !areaCounts) return;
    
    grid.innerHTML = '';
    
    if (areaCounts.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-soft);font-size:.8rem;padding:.5rem;">No areas found</p>';
      return;
    }
    
    areaCounts.forEach(item => {
      const hasItems = item.count > 0;
      const colorClass = hasItems ? 'area-green' : 'area-red';
      const activeClass = state.obsArea === item.area ? 'area-active' : '';
      
      const box = document.createElement('div');
      box.className = `permit-area-box ${colorClass} ${activeClass}`;
      box.dataset.area = item.area;
      box.innerHTML = `
        <span class="permit-area-name">${item.area}</span>
        <span class="permit-area-count">${item.count}</span>
      `;
      box.addEventListener('click', () => handleObsAreaBoxClick(item.area));
      grid.appendChild(box);
    });
    
    const clearBtn = $('#clearObsAreaFilter');
    if (clearBtn) {
      clearBtn.style.display = state.obsArea ? 'block' : 'none';
    }
  }

  function handleObsAreaBoxClick(area) {
    if (state.obsArea === area) {
      state.obsArea = '';
      if ($('#obsFilterArea')) $('#obsFilterArea').value = '';
    } else {
      state.obsArea = area;
      if ($('#obsFilterArea')) $('#obsFilterArea').value = area;
    }
    loadObservations();
  }

  async function loadEqAreaBoxes() {
    const areaCounts = await apiCall('/equipment/area-counts');
    const grid = $('#eqAreasGrid');
    if (!grid || !areaCounts) return;
    
    grid.innerHTML = '';
    
    if (areaCounts.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-soft);font-size:.8rem;padding:.5rem;">No areas found</p>';
      return;
    }
    
    areaCounts.forEach(item => {
      const hasItems = item.count > 0;
      const colorClass = hasItems ? 'area-green' : 'area-red';
      const activeClass = state.eqArea === item.area ? 'area-active' : '';
      
      const box = document.createElement('div');
      box.className = `permit-area-box ${colorClass} ${activeClass}`;
      box.dataset.area = item.area;
      box.innerHTML = `
        <span class="permit-area-name">${item.area}</span>
        <span class="permit-area-count">${item.count}</span>
      `;
      box.addEventListener('click', () => handleEqAreaBoxClick(item.area));
      grid.appendChild(box);
    });
    
    const clearBtn = $('#clearEqAreaFilter');
    if (clearBtn) {
      clearBtn.style.display = state.eqArea ? 'block' : 'none';
    }
  }

  function handleEqAreaBoxClick(area) {
    if (state.eqArea === area) {
      state.eqArea = '';
      if ($('#eqFilterArea')) $('#eqFilterArea').value = '';
    } else {
      state.eqArea = area;
      if ($('#eqFilterArea')) $('#eqFilterArea').value = area;
    }
    loadEquipment();
  }

  async function loadTbtAreaBoxes() {
    const params = new URLSearchParams();
    if (state.tbtRange !== 'all') params.append('range', state.tbtRange);
    const areaCounts = await apiCall(`/toolbox-talks/area-counts?${params}`);
    const grid = $('#tbtAreasGrid');
    if (!grid || !areaCounts) return;
    
    grid.innerHTML = '';
    
    if (areaCounts.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-soft);font-size:.8rem;padding:.5rem;">No areas found</p>';
      return;
    }
    
    areaCounts.forEach(item => {
      const hasItems = item.count > 0;
      const colorClass = hasItems ? 'area-green' : 'area-red';
      const activeClass = state.tbtArea === item.area ? 'area-active' : '';
      
      const box = document.createElement('div');
      box.className = `permit-area-box ${colorClass} ${activeClass}`;
      box.dataset.area = item.area;
      box.innerHTML = `
        <span class="permit-area-name">${item.area}</span>
        <span class="permit-area-count">${item.count}</span>
      `;
      box.addEventListener('click', () => handleTbtAreaBoxClick(item.area));
      grid.appendChild(box);
    });
    
    const clearBtn = $('#clearTbtAreaFilter');
    if (clearBtn) {
      clearBtn.style.display = state.tbtArea ? 'block' : 'none';
    }
  }

  function handleTbtAreaBoxClick(area) {
    if (state.tbtArea === area) {
      state.tbtArea = '';
      if ($('#tbtFilterArea')) $('#tbtFilterArea').value = '';
    } else {
      state.tbtArea = area;
      if ($('#tbtFilterArea')) $('#tbtFilterArea').value = area;
    }
    loadTbt();
  }

  async function loadPermits() {
    await loadPermitStats();
    await loadPermitAreaBoxes();
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
    await loadEqAreaBoxes();
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
    await loadTbtAreaBoxes();
    const params = new URLSearchParams();
    if (state.tbtRange !== 'all') params.append('range', state.tbtRange);
    if (state.tbtArea) params.append('area', state.tbtArea);
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
    $('#tbtFilterArea')?.addEventListener('change', e => { state.tbtArea = e.target.value; loadTbt(); });
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
    const iconClass = currentLibrary || 'csm';
    list.innerHTML = filtered.length ? `<div class="library-doc-list">${filtered.map(d => `
      <div class="library-doc-item" onclick="openDocViewer('${d.title.replace(/'/g, "\\'")}', '${d.link.replace('/view', '/preview')}')">
        <div class="library-doc-icon ${iconClass}"><i class="fas fa-file-pdf"></i></div>
        <div class="library-doc-info">
          <div class="library-doc-title">${d.title}</div>
          <div class="library-doc-desc">Tap to view document</div>
        </div>
        <div class="library-doc-action"><i class="fas fa-eye"></i></div>
      </div>
    `).join('')}</div>` : '<div class="no-data">No documents found</div>';
  }
  window.openLibrarySection = openLibrarySection;
  window.closeLibrarySection = closeLibrarySection;
  $('#librarySearch')?.addEventListener('input', e => {
    const data = getLibraryData(currentLibrary);
    renderLibrary(data, e.target.value);
  });

  function toggleToolSection(id) {
    const sections = ['trainingMatrix', 'heatStress', 'windSpeed', 'riskMatrix', 'lifeSaving', 'challenges', 'quiz', 'ppeGuide', 'noiseLevel'];
    sections.forEach(s => {
      const el = document.getElementById(s + 'Section');
      if (el) el.style.display = s === id && el.style.display !== 'block' ? 'block' : 'none';
    });
    if (id === 'challenges') loadChallenges();
    if (id === 'noiseLevel') initNoiseLevel();
    if (id !== 'noiseLevel' && isListening) stopNoiseMeasurement();
  }
  window.toggleToolSection = toggleToolSection;

  const NEW_TOOLS_CONTENT = {
    fireExtinguisher: {
      title: 'Fire Extinguisher Guide',
      icon: 'fa-fire-extinguisher',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Select the correct fire extinguisher based on fire class per Saudi Aramco and OSHA standards.</p>
          
          <div class="pass-technique-section">
            <h4><i class="fas fa-hand-paper"></i> P.A.S.S. Technique</h4>
            <div class="pass-steps">
              <div class="pass-step">
                <div class="pass-icon"><i class="fas fa-hand-rock"></i></div>
                <div class="pass-letter">P</div>
                <div class="pass-text"><strong>PULL</strong><span>Pull the pin to break the seal</span></div>
              </div>
              <div class="pass-step">
                <div class="pass-icon"><i class="fas fa-crosshairs"></i></div>
                <div class="pass-letter">A</div>
                <div class="pass-text"><strong>AIM</strong><span>Aim low at the base of the fire</span></div>
              </div>
              <div class="pass-step">
                <div class="pass-icon"><i class="fas fa-hand-point-down"></i></div>
                <div class="pass-letter">S</div>
                <div class="pass-text"><strong>SQUEEZE</strong><span>Squeeze the handle to release agent</span></div>
              </div>
              <div class="pass-step">
                <div class="pass-icon"><i class="fas fa-arrows-alt-h"></i></div>
                <div class="pass-letter">S</div>
                <div class="pass-text"><strong>SWEEP</strong><span>Sweep side to side at the base</span></div>
              </div>
            </div>
          </div>

          <div class="fire-ext-grid">
            <div class="fire-ext-card class-a">
              <div class="fire-ext-header">
                <div class="fire-class-symbol triangle"><span>A</span></div>
                <h4>Class A - Ordinary Combustibles</h4>
              </div>
              <div class="fire-ext-body">
                <div class="fire-materials">
                  <div class="material-icon"><i class="fas fa-tree"></i></div>
                  <div class="material-icon"><i class="fas fa-scroll"></i></div>
                  <div class="material-icon"><i class="fas fa-tshirt"></i></div>
                </div>
                <p><strong>Materials:</strong> Wood, paper, cloth, rubber, plastics</p>
                <div class="ext-types-row">
                  <div class="ext-canister water"><i class="fas fa-fire-extinguisher"></i><span>Water</span></div>
                  <div class="ext-canister foam"><i class="fas fa-fire-extinguisher"></i><span>Foam</span></div>
                  <div class="ext-canister abc"><i class="fas fa-fire-extinguisher"></i><span>ABC</span></div>
                </div>
              </div>
            </div>
            <div class="fire-ext-card class-b">
              <div class="fire-ext-header">
                <div class="fire-class-symbol square"><span>B</span></div>
                <h4>Class B - Flammable Liquids</h4>
              </div>
              <div class="fire-ext-body">
                <div class="fire-materials">
                  <div class="material-icon"><i class="fas fa-gas-pump"></i></div>
                  <div class="material-icon"><i class="fas fa-oil-can"></i></div>
                  <div class="material-icon"><i class="fas fa-paint-brush"></i></div>
                </div>
                <p><strong>Materials:</strong> Gasoline, oil, grease, paints, solvents</p>
                <div class="ext-types-row">
                  <div class="ext-canister co2"><i class="fas fa-fire-extinguisher"></i><span>CO2</span></div>
                  <div class="ext-canister foam"><i class="fas fa-fire-extinguisher"></i><span>Foam</span></div>
                  <div class="ext-canister powder"><i class="fas fa-fire-extinguisher"></i><span>Powder</span></div>
                </div>
              </div>
            </div>
            <div class="fire-ext-card class-c">
              <div class="fire-ext-header">
                <div class="fire-class-symbol circle"><span>C</span></div>
                <h4>Class C - Electrical Equipment</h4>
              </div>
              <div class="fire-ext-body">
                <div class="fire-materials">
                  <div class="material-icon"><i class="fas fa-bolt"></i></div>
                  <div class="material-icon"><i class="fas fa-plug"></i></div>
                  <div class="material-icon"><i class="fas fa-server"></i></div>
                </div>
                <p><strong>Materials:</strong> Energized electrical equipment, motors, panels</p>
                <div class="ext-types-row">
                  <div class="ext-canister co2"><i class="fas fa-fire-extinguisher"></i><span>CO2</span></div>
                  <div class="ext-canister powder"><i class="fas fa-fire-extinguisher"></i><span>Dry Chem</span></div>
                </div>
                <div class="ext-warning"><i class="fas fa-exclamation-triangle"></i> NEVER use water on electrical fires!</div>
              </div>
            </div>
            <div class="fire-ext-card class-d">
              <div class="fire-ext-header">
                <div class="fire-class-symbol star"><span>D</span></div>
                <h4>Class D - Combustible Metals</h4>
              </div>
              <div class="fire-ext-body">
                <div class="fire-materials">
                  <div class="material-icon"><i class="fas fa-cubes"></i></div>
                  <div class="material-icon"><i class="fas fa-atom"></i></div>
                  <div class="material-icon"><i class="fas fa-industry"></i></div>
                </div>
                <p><strong>Materials:</strong> Magnesium, titanium, sodium, potassium</p>
                <div class="ext-types-row">
                  <div class="ext-canister special"><i class="fas fa-fire-extinguisher"></i><span>Met-L-X</span></div>
                  <div class="ext-canister special"><i class="fas fa-fire-extinguisher"></i><span>D-Type</span></div>
                </div>
                <div class="ext-warning"><i class="fas fa-exclamation-triangle"></i> Requires specialized extinguisher</div>
              </div>
            </div>
            <div class="fire-ext-card class-k">
              <div class="fire-ext-header">
                <div class="fire-class-symbol hexagon"><span>K</span></div>
                <h4>Class K - Cooking Oils/Fats</h4>
              </div>
              <div class="fire-ext-body">
                <div class="fire-materials">
                  <div class="material-icon"><i class="fas fa-utensils"></i></div>
                  <div class="material-icon"><i class="fas fa-bacon"></i></div>
                  <div class="material-icon"><i class="fas fa-blender"></i></div>
                </div>
                <p><strong>Materials:</strong> Kitchen cooking oils, animal fats, vegetable fats</p>
                <div class="ext-types-row">
                  <div class="ext-canister wetchem"><i class="fas fa-fire-extinguisher"></i><span>Wet Chemical</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="extinguisher-color-guide">
            <h4><i class="fas fa-palette"></i> Extinguisher Color Codes (UK/International)</h4>
            <div class="color-guide-row">
              <div class="color-label water-label"><span class="color-band"></span>Water - Red</div>
              <div class="color-label foam-label"><span class="color-band"></span>Foam - Cream</div>
              <div class="color-label powder-label"><span class="color-band"></span>Powder - Blue</div>
              <div class="color-label co2-label"><span class="color-band"></span>CO2 - Black</div>
              <div class="color-label wetchem-label"><span class="color-band"></span>Wet Chem - Yellow</div>
            </div>
          </div>

          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM I-7: Fire extinguishers must be inspected monthly and serviced annually. All workers must be trained on P.A.S.S. technique.</span>
          </div>
        </div>
      `
    },
    barricadeSignage: {
      title: 'Barricade/Signage Guide',
      icon: 'fa-exclamation-triangle',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Proper barricading and signage requirements per Saudi Aramco and OSHA standards.</p>
          <div class="barricade-grid">
            <div class="barricade-card danger">
              <div class="barricade-header">
                <i class="fas fa-skull"></i>
                <h4>DANGER - Red</h4>
              </div>
              <div class="barricade-body">
                <p><strong>Use When:</strong> Immediate hazard that WILL cause death or serious injury</p>
                <ul>
                  <li>Confined space entry in progress</li>
                  <li>Live electrical work</li>
                  <li>Radiation areas</li>
                  <li>High pressure testing</li>
                </ul>
                <div class="barricade-tape danger-tape">RED TAPE / HARD BARRICADE</div>
              </div>
            </div>
            <div class="barricade-card warning">
              <div class="barricade-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>WARNING - Orange</h4>
              </div>
              <div class="barricade-body">
                <p><strong>Use When:</strong> Hazard that COULD cause death or serious injury</p>
                <ul>
                  <li>Overhead work in progress</li>
                  <li>Excavation areas</li>
                  <li>Crane operations</li>
                  <li>Hot work areas</li>
                </ul>
                <div class="barricade-tape warning-tape">ORANGE TAPE / SOFT BARRICADE</div>
              </div>
            </div>
            <div class="barricade-card caution">
              <div class="barricade-header">
                <i class="fas fa-exclamation"></i>
                <h4>CAUTION - Yellow</h4>
              </div>
              <div class="barricade-body">
                <p><strong>Use When:</strong> Minor hazard that could cause injury</p>
                <ul>
                  <li>Wet floors</li>
                  <li>Temporary obstructions</li>
                  <li>Low clearance areas</li>
                  <li>Step hazards</li>
                </ul>
                <div class="barricade-tape caution-tape">YELLOW TAPE / CONES</div>
              </div>
            </div>
            <div class="barricade-card info">
              <div class="barricade-header">
                <i class="fas fa-hard-hat"></i>
                <h4>NOTICE - Blue</h4>
              </div>
              <div class="barricade-body">
                <p><strong>Use When:</strong> Information or instruction (no immediate hazard)</p>
                <ul>
                  <li>PPE requirements</li>
                  <li>Authorized personnel only</li>
                  <li>Housekeeping areas</li>
                  <li>Designated pathways</li>
                </ul>
                <div class="barricade-tape info-tape">BLUE SIGNAGE</div>
              </div>
            </div>
          </div>
          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM I-4: Hard barricades are required for life-threatening hazards. All barricades must be signed and dated by responsible person.</span>
          </div>
        </div>
      `
    },
    hazardClassification: {
      title: 'GHS Hazard Classification Guide',
      icon: 'fa-skull-crossbones',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Globally Harmonized System (GHS) pictograms and hazard categories per OSHA/Aramco standards.</p>
          <div class="ghs-grid">
            <div class="ghs-card">
              <div class="ghs-pictogram explosive"><i class="fas fa-bomb"></i></div>
              <h4>Explosive</h4>
              <p>Explosives, self-reactives, organic peroxides</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram flammable"><i class="fas fa-fire"></i></div>
              <h4>Flammable</h4>
              <p>Flammable gases, liquids, solids, aerosols</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram oxidizer"><i class="fas fa-circle"></i></div>
              <h4>Oxidizer</h4>
              <p>Oxidizing gases, liquids, solids</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram compressed"><i class="fas fa-compress-arrows-alt"></i></div>
              <h4>Compressed Gas</h4>
              <p>Gases under pressure, liquefied, dissolved</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram corrosive"><i class="fas fa-flask"></i></div>
              <h4>Corrosive</h4>
              <p>Corrosive to metals, skin, eyes</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram toxic"><i class="fas fa-skull-crossbones"></i></div>
              <h4>Acute Toxicity</h4>
              <p>Fatal or toxic if inhaled, ingested, or absorbed</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram irritant"><i class="fas fa-exclamation"></i></div>
              <h4>Irritant/Harmful</h4>
              <p>Skin/eye irritation, respiratory sensitizer</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram health"><i class="fas fa-heartbeat"></i></div>
              <h4>Health Hazard</h4>
              <p>Carcinogen, mutagen, reproductive toxicity</p>
            </div>
            <div class="ghs-card">
              <div class="ghs-pictogram environment"><i class="fas fa-leaf"></i></div>
              <h4>Environmental</h4>
              <p>Hazardous to aquatic environment</p>
            </div>
          </div>
          <div class="ghs-signal-words">
            <div class="signal-danger"><strong>DANGER</strong> - More severe hazard</div>
            <div class="signal-warning"><strong>WARNING</strong> - Less severe hazard</div>
          </div>
          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM I-10: All hazardous materials must have proper SDS available. Workers must be trained on GHS labeling before handling chemicals.</span>
          </div>
        </div>
      `
    },
    gasDetection: {
      title: 'Gas Detection Reference',
      icon: 'fa-broadcast-tower',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Common gas detection limits and exposure values per Saudi Aramco and OSHA standards.</p>
          <div class="gas-table-container">
            <table class="gas-table">
              <thead>
                <tr>
                  <th>Gas</th>
                  <th>LEL %</th>
                  <th>UEL %</th>
                  <th>PEL (ppm)</th>
                  <th>IDLH (ppm)</th>
                  <th>Alarm Levels</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Hydrogen Sulfide (H2S)</strong></td>
                  <td>4.0</td>
                  <td>44.0</td>
                  <td>10</td>
                  <td>100</td>
                  <td class="alarm-cell">Low: 10 | High: 15</td>
                </tr>
                <tr>
                  <td><strong>Methane (CH4)</strong></td>
                  <td>5.0</td>
                  <td>15.0</td>
                  <td>1000</td>
                  <td>N/A</td>
                  <td class="alarm-cell">10% LEL | 20% LEL</td>
                </tr>
                <tr>
                  <td><strong>Carbon Monoxide (CO)</strong></td>
                  <td>12.5</td>
                  <td>74.0</td>
                  <td>50</td>
                  <td>1200</td>
                  <td class="alarm-cell">Low: 35 | High: 200</td>
                </tr>
                <tr>
                  <td><strong>Oxygen (O2)</strong></td>
                  <td colspan="2">Normal: 20.9%</td>
                  <td colspan="2">Min: 19.5% | Max: 23.5%</td>
                  <td class="alarm-cell">Low: 19.5 | High: 23.5</td>
                </tr>
                <tr>
                  <td><strong>Benzene</strong></td>
                  <td>1.2</td>
                  <td>7.8</td>
                  <td>1</td>
                  <td>500</td>
                  <td class="alarm-cell">Low: 0.5 | High: 1</td>
                </tr>
                <tr>
                  <td><strong>Ammonia (NH3)</strong></td>
                  <td>15.0</td>
                  <td>28.0</td>
                  <td>50</td>
                  <td>300</td>
                  <td class="alarm-cell">Low: 25 | High: 50</td>
                </tr>
                <tr>
                  <td><strong>Sulfur Dioxide (SO2)</strong></td>
                  <td>N/A</td>
                  <td>N/A</td>
                  <td>5</td>
                  <td>100</td>
                  <td class="alarm-cell">Low: 2 | High: 5</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="gas-legend">
            <div class="legend-item"><strong>LEL:</strong> Lower Explosive Limit</div>
            <div class="legend-item"><strong>UEL:</strong> Upper Explosive Limit</div>
            <div class="legend-item"><strong>PEL:</strong> Permissible Exposure Limit (8-hr TWA)</div>
            <div class="legend-item"><strong>IDLH:</strong> Immediately Dangerous to Life/Health</div>
          </div>
          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM I-6: 4-gas monitors (O2, LEL, H2S, CO) are mandatory for confined space entry. Bump test daily, calibrate per manufacturer requirements.</span>
          </div>
        </div>
      `
    },
    incidentInvestigation: {
      title: 'Incident Investigation - 5 Whys',
      icon: 'fa-search',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Root cause analysis using the 5 Whys methodology per NEBOSH/Aramco incident investigation standards.</p>
          <div class="five-whys-container">
            <div class="incident-input-section">
              <label><i class="fas fa-exclamation-circle"></i> Describe the Incident:</label>
              <textarea id="incidentDescription" placeholder="Example: Worker slipped and fell on the walkway..." rows="2"></textarea>
            </div>
            <div class="whys-section">
              <div class="why-item">
                <label><span class="why-number">1</span> Why did this happen?</label>
                <input type="text" id="why1" placeholder="First level cause..." oninput="updateWhyChain()"/>
              </div>
              <div class="why-item">
                <label><span class="why-number">2</span> Why?</label>
                <input type="text" id="why2" placeholder="Second level cause..." oninput="updateWhyChain()"/>
              </div>
              <div class="why-item">
                <label><span class="why-number">3</span> Why?</label>
                <input type="text" id="why3" placeholder="Third level cause..." oninput="updateWhyChain()"/>
              </div>
              <div class="why-item">
                <label><span class="why-number">4</span> Why?</label>
                <input type="text" id="why4" placeholder="Fourth level cause..." oninput="updateWhyChain()"/>
              </div>
              <div class="why-item">
                <label><span class="why-number">5</span> Why? (Root Cause)</label>
                <input type="text" id="why5" placeholder="Root cause..." oninput="updateWhyChain()"/>
              </div>
            </div>
            <div class="root-cause-section" id="rootCauseSection" style="display:none;">
              <h4><i class="fas fa-crosshairs"></i> Identified Root Cause</h4>
              <div id="rootCauseDisplay" class="root-cause-display"></div>
              <div class="corrective-action">
                <label><i class="fas fa-tools"></i> Recommended Corrective Action:</label>
                <textarea id="correctiveAction" placeholder="Enter corrective action to prevent recurrence..." rows="2"></textarea>
              </div>
            </div>
            <button class="pro-btn" onclick="clearFiveWhys()"><i class="fas fa-redo"></i> Reset Analysis</button>
          </div>
          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM I-2: All incidents must be investigated within 24 hours. Root cause analysis is mandatory for all recordable incidents.</span>
          </div>
        </div>
      `
    },
    emergencyResponse: {
      title: 'Emergency Response Flowchart',
      icon: 'fa-ambulance',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Quick reference emergency response decision tree per Saudi Aramco CSM I-1 and IOSH guidelines.</p>
          <div class="emergency-flowchart">
            <div class="emergency-step step-alert">
              <div class="step-number">1</div>
              <div class="step-content">
                <h4><i class="fas fa-bell"></i> ALERT</h4>
                <p>Identify the emergency type and ensure your own safety first</p>
              </div>
            </div>
            <div class="flow-arrow"><i class="fas fa-arrow-down"></i></div>
            <div class="emergency-step step-assess">
              <div class="step-number">2</div>
              <div class="step-content">
                <h4><i class="fas fa-search"></i> ASSESS</h4>
                <p>Evaluate casualties, hazards, and resources needed</p>
              </div>
            </div>
            <div class="flow-arrow"><i class="fas fa-arrow-down"></i></div>
            <div class="emergency-step step-call">
              <div class="step-number">3</div>
              <div class="step-content">
                <h4><i class="fas fa-phone"></i> CALL FOR HELP</h4>
                <div class="emergency-contacts">
                  <div class="contact-item"><strong>Aramco Emergency:</strong> 110</div>
                  <div class="contact-item"><strong>Site Emergency:</strong> Check local ERP</div>
                  <div class="contact-item"><strong>HSE Officer:</strong> Notify immediately</div>
                </div>
              </div>
            </div>
            <div class="flow-arrow"><i class="fas fa-arrow-down"></i></div>
            <div class="emergency-types-grid">
              <div class="emergency-type-card fire">
                <h5><i class="fas fa-fire"></i> FIRE</h5>
                <ol>
                  <li>Activate fire alarm</li>
                  <li>Evacuate area</li>
                  <li>Use extinguisher if trained</li>
                  <li>Meet at assembly point</li>
                </ol>
              </div>
              <div class="emergency-type-card injury">
                <h5><i class="fas fa-user-injured"></i> INJURY</h5>
                <ol>
                  <li>Do not move victim (if spinal)</li>
                  <li>Apply first aid if trained</li>
                  <li>Control bleeding</li>
                  <li>Monitor breathing</li>
                </ol>
              </div>
              <div class="emergency-type-card spill">
                <h5><i class="fas fa-tint"></i> CHEMICAL SPILL</h5>
                <ol>
                  <li>Evacuate affected area</li>
                  <li>Identify chemical (SDS)</li>
                  <li>Don proper PPE</li>
                  <li>Contain if safe to do so</li>
                </ol>
              </div>
              <div class="emergency-type-card gas">
                <h5><i class="fas fa-wind"></i> GAS RELEASE</h5>
                <ol>
                  <li>Evacuate upwind</li>
                  <li>Do not operate switches</li>
                  <li>Account for personnel</li>
                  <li>Wait for all-clear</li>
                </ol>
              </div>
            </div>
          </div>
          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM I-1: All personnel must know assembly points and evacuation routes. Emergency drills are conducted quarterly.</span>
          </div>
        </div>
      `
    },
    firstAidKit: {
      title: 'First Aid Kit Inventory Checker',
      icon: 'fa-first-aid',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Comprehensive first aid kit checklist per OSHA 1910.151 and Saudi Aramco CSM requirements.</p>
          
          <div class="first-aid-header-card">
            <div class="fa-kit-icon"><i class="fas fa-briefcase-medical"></i></div>
            <div class="fa-kit-info">
              <h4>First Aid Kit Inspection</h4>
              <p>Monthly inspection required per Aramco standards</p>
            </div>
            <div class="fa-kit-status">
              <div class="fa-progress-ring">
                <svg viewBox="0 0 36 36">
                  <circle class="fa-progress-bg" cx="18" cy="18" r="16"/>
                  <circle class="fa-progress-bar" id="faProgressBar" cx="18" cy="18" r="16" stroke-dasharray="0 100"/>
                </svg>
                <span class="fa-progress-text" id="faProgressText">0%</span>
              </div>
            </div>
          </div>
          
          <div class="first-aid-checklist">
            <div class="checklist-items" id="firstAidItems">
              <div class="checklist-category wound-care">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-band-aid"></i></div>
                  <h5>Wound Care & Bandages</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Adhesive bandages (assorted sizes) - Min 16</span><span class="item-qty">16+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Sterile gauze pads 3x3" - Min 4</span><span class="item-qty">4+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Sterile gauze pads 4x4" - Min 4</span><span class="item-qty">4+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Gauze roller bandages (2", 3")</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Triangular bandages/slings</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Wound cleaning antiseptic wipes</span><span class="item-qty">10+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Non-adherent wound pads</span><span class="item-qty">4+</span></label>
              </div>
              
              <div class="checklist-category taping">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-tape"></i></div>
                  <h5>Taping & Closures</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Medical/surgical tape roll</span><span class="item-qty">1+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Elastic wrap bandage (ACE type)</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Butterfly closures/steri-strips</span><span class="item-qty">8+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Self-adhesive bandage wrap</span><span class="item-qty">1+</span></label>
              </div>
              
              <div class="checklist-category eye-care">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-eye"></i></div>
                  <h5>Eye & Face Care</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Eye wash solution (min 4oz/120ml)</span><span class="item-qty">1+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Sterile eye pads</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Eye wash cup</span><span class="item-qty">1+</span></label>
              </div>
              
              <div class="checklist-category burn-care">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-fire-alt"></i></div>
                  <h5>Burn Care</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Burn dressing (non-stick)</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Burn gel packets/spray</span><span class="item-qty">4+</span></label>
              </div>
              
              <div class="checklist-category trauma">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-bone"></i></div>
                  <h5>Trauma & Fractures</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">SAM splint or finger splints</span><span class="item-qty">1+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Cold pack (instant/chemical)</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Emergency blanket (thermal)</span><span class="item-qty">1+</span></label>
              </div>
              
              <div class="checklist-category tools">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-tools"></i></div>
                  <h5>Tools & Instruments</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Trauma shears/scissors</span><span class="item-qty">1+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Tweezers (fine point)</span><span class="item-qty">1+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Safety pins (assorted)</span><span class="item-qty">6+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Penlight/flashlight</span><span class="item-qty">1+</span></label>
              </div>
              
              <div class="checklist-category ppe-medical">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-shield-virus"></i></div>
                  <h5>PPE & Infection Control</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Nitrile/latex gloves (pairs)</span><span class="item-qty">4+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">CPR face shield/pocket mask</span><span class="item-qty">1+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Biohazard disposal bag</span><span class="item-qty">2+</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Hand sanitizer</span><span class="item-qty">1+</span></label>
              </div>
              
              <div class="checklist-category additional">
                <div class="category-header">
                  <div class="category-icon"><i class="fas fa-plus-circle"></i></div>
                  <h5>Documentation & Extras</h5>
                </div>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">First aid instruction manual</span><span class="item-qty">1</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Emergency contact card</span><span class="item-qty">1</span></label>
                <label class="checklist-item"><input type="checkbox" onchange="updateFirstAidCount()"/><span class="item-text">Inspection log sheet</span><span class="item-qty">1</span></label>
              </div>
            </div>
            
            <div class="checklist-status" id="firstAidStatus">
              <div class="status-icon"><i class="fas fa-exclamation-circle"></i></div>
              <div class="status-text">
                <strong>Inspection Incomplete</strong>
                <span>Check all items to verify kit compliance</span>
              </div>
            </div>
            
            <div class="checklist-actions">
              <button class="fa-action-btn reset" onclick="resetFirstAidChecklist()"><i class="fas fa-redo"></i> Reset</button>
              <button class="fa-action-btn print" onclick="window.print()"><i class="fas fa-print"></i> Print Report</button>
            </div>
          </div>
          
          <div class="fa-standards-card">
            <div class="fa-standard-row">
              <div class="fa-standard-icon"><i class="fas fa-calendar-check"></i></div>
              <div class="fa-standard-info">
                <strong>Monthly Inspection</strong>
                <span>First aid kits must be inspected monthly per Aramco CSM</span>
              </div>
            </div>
            <div class="fa-standard-row">
              <div class="fa-standard-icon"><i class="fas fa-heart"></i></div>
              <div class="fa-standard-info">
                <strong>AED Availability</strong>
                <span>AED required in high-risk areas and workshops</span>
              </div>
            </div>
            <div class="fa-standard-row">
              <div class="fa-standard-icon"><i class="fas fa-user-md"></i></div>
              <div class="fa-standard-info">
                <strong>Trained First Aiders</strong>
                <span>Ratio: 1 certified first aider per 50 workers</span>
              </div>
            </div>
          </div>
        </div>
      `
    },
    safetyMeetingTimer: {
      title: 'Safety Meeting Timer',
      icon: 'fa-clock',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Toolbox talk timer with Aramco-approved safety topics for daily pre-work meetings.</p>
          <div class="meeting-timer-container">
            <div class="timer-display">
              <div class="timer-circle" id="timerCircle">
                <span class="timer-time" id="timerDisplay">05:00</span>
                <span class="timer-label">minutes</span>
              </div>
            </div>
            <div class="timer-controls">
              <button class="timer-btn start" id="startTimerBtn" onclick="startMeetingTimer()"><i class="fas fa-play"></i> Start</button>
              <button class="timer-btn pause" id="pauseTimerBtn" onclick="pauseMeetingTimer()" style="display:none;"><i class="fas fa-pause"></i> Pause</button>
              <button class="timer-btn reset" onclick="resetMeetingTimer()"><i class="fas fa-redo"></i> Reset</button>
            </div>
            <div class="timer-presets">
              <button class="preset-btn" onclick="setTimerPreset(5)">5 min</button>
              <button class="preset-btn active" onclick="setTimerPreset(5)">5 min</button>
              <button class="preset-btn" onclick="setTimerPreset(10)">10 min</button>
              <button class="preset-btn" onclick="setTimerPreset(15)">15 min</button>
            </div>
          </div>
          <div class="tbt-topic-section">
            <h4><i class="fas fa-lightbulb"></i> Today's Suggested Topic</h4>
            <div class="tbt-topic-card" id="tbtTopicCard">
              <div class="topic-title" id="randomTopicTitle">Click to get a topic</div>
              <div class="topic-points" id="randomTopicPoints"></div>
            </div>
            <button class="pro-btn secondary" onclick="getRandomTBTTopic()"><i class="fas fa-random"></i> Get Random Topic</button>
          </div>
          <div class="meeting-checklist">
            <h4><i class="fas fa-clipboard-list"></i> Meeting Checklist</h4>
            <label class="meeting-check"><input type="checkbox"/> Attendance recorded</label>
            <label class="meeting-check"><input type="checkbox"/> PPE check completed</label>
            <label class="meeting-check"><input type="checkbox"/> Hazards discussed</label>
            <label class="meeting-check"><input type="checkbox"/> Questions answered</label>
            <label class="meeting-check"><input type="checkbox"/> Work permit reviewed</label>
          </div>
          <div class="pro-tool-note">
            <i class="fas fa-info-circle"></i>
            <span>Per Saudi Aramco CSM: Daily toolbox talks are mandatory before work begins. Duration should be 5-15 minutes. All attendees must sign the TBT form.</span>
          </div>
        </div>
      `
    },
    handSignals: {
      title: 'Hand Signals Reference Guide',
      icon: 'fa-hands',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Standard hand signals for crane operations, rigging, and traffic control. Click any signal to view details or print.</p>
          <div class="signal-category-tabs">
            <button class="signal-tab active" onclick="switchSignalCategory('crane')">Crane Signals</button>
            <button class="signal-tab" onclick="switchSignalCategory('rigger')">Rigger Signals</button>
            <button class="signal-tab" onclick="switchSignalCategory('traffic')">Traffic Control</button>
          </div>
          <div id="signalCardsContainer" class="signal-cards-grid"></div>
          <div class="print-all-section">
            <button class="pro-btn primary" onclick="printAllSignals()"><i class="fas fa-print"></i> Print All Signals</button>
          </div>
        </div>
      `
    },
    firstAidGuide: {
      title: 'First Aid Response Guide',
      icon: 'fa-heartbeat',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Step-by-step first aid procedures for common emergencies. Select a scenario to view detailed instructions.</p>
          <div class="first-aid-category-tabs">
            <button class="fa-tab active" onclick="switchFirstAidCategory('all')">All</button>
            <button class="fa-tab" onclick="switchFirstAidCategory('life')">Life-Threatening</button>
            <button class="fa-tab" onclick="switchFirstAidCategory('injury')">Injuries</button>
            <button class="fa-tab" onclick="switchFirstAidCategory('environmental')">Environmental</button>
          </div>
          <div id="firstAidScenariosContainer" class="first-aid-scenarios-grid"></div>
        </div>
      `
    },
    safetyLimits: {
      title: 'Safety Limits Quick Reference',
      icon: 'fa-ruler-combined',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Quick lookup for critical safety distances, thresholds, and requirements per Aramco standards.</p>
          <div class="limits-search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="limitsSearchInput" placeholder="Search limits (e.g., ladder, cylinder, excavation...)" oninput="filterSafetyLimits()">
          </div>
          <div class="limits-category-tabs">
            <button class="limits-tab active" onclick="switchLimitsCategory('all')">All</button>
            <button class="limits-tab" onclick="switchLimitsCategory('distance')">Distances</button>
            <button class="limits-tab" onclick="switchLimitsCategory('time')">Time Limits</button>
            <button class="limits-tab" onclick="switchLimitsCategory('pressure')">Pressure/Temp</button>
            <button class="limits-tab" onclick="switchLimitsCategory('ppe')">PPE Requirements</button>
          </div>
          <div id="safetyLimitsContainer" class="safety-limits-grid"></div>
        </div>
      `
    },
    adaptiveLearning: {
      title: 'Adaptive Learning Mode',
      icon: 'fa-brain',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Personalized micro-drills based on quiz questions you've missed. Strengthen your weak areas!</p>
          <div id="adaptiveLearningStats" class="adaptive-stats"></div>
          <div id="adaptiveDrillContainer" class="adaptive-drill-container"></div>
          <div id="adaptiveEmptyState" class="adaptive-empty-state">
            <i class="fas fa-graduation-cap"></i>
            <h4>No Weak Areas Detected</h4>
            <p>Complete some daily quizzes first. Questions you get wrong will appear here for extra practice.</p>
            <button class="pro-btn primary" onclick="openToolFullView('quiz')"><i class="fas fa-question-circle"></i> Take Daily Quiz</button>
          </div>
        </div>
      `
    },
    safetySigns: {
      title: 'Safety Signs Reference',
      icon: 'fa-sign',
      content: `
        <div class="pro-tool-container">
          <p class="pro-tool-desc">Comprehensive reference of workplace safety signs. Search, learn meanings, and print for posting.</p>
          <div class="signs-search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="signsSearchInput" placeholder="Search signs..." oninput="filterSafetySigns()">
          </div>
          <div class="signs-category-tabs">
            <button class="signs-tab active" data-category="all" onclick="switchSignsCategory('all')">All Signs</button>
            <button class="signs-tab" data-category="warning" onclick="switchSignsCategory('warning')">Warning</button>
            <button class="signs-tab" data-category="prohibition" onclick="switchSignsCategory('prohibition')">Prohibition</button>
            <button class="signs-tab" data-category="mandatory" onclick="switchSignsCategory('mandatory')">Mandatory</button>
            <button class="signs-tab" data-category="emergency" onclick="switchSignsCategory('emergency')">Emergency</button>
            <button class="signs-tab" data-category="fire" onclick="switchSignsCategory('fire')">Fire Safety</button>
          </div>
          <div id="safetySignsContainer" class="safety-signs-grid"></div>
          <button class="pro-btn primary" onclick="printAllSigns()" style="margin-top:1.5rem;"><i class="fas fa-print"></i> Print Signs Reference</button>
        </div>
      `
    }
  };

  const TBT_TOPICS = [
    { title: 'Working at Heights Safety', points: ['100% tie-off policy', 'Inspect harness daily', 'Secure tools to prevent drops', 'Know rescue plan'] },
    { title: 'Heat Stress Prevention', points: ['Hydrate frequently', 'Take scheduled breaks', 'Know signs of heat stroke', 'Buddy system monitoring'] },
    { title: 'Confined Space Entry', points: ['Valid permit required', 'Atmospheric testing', 'Standby person assigned', 'Emergency retrieval ready'] },
    { title: 'Hand Safety', points: ['Right glove for the task', 'Keep hands clear of pinch points', 'Use tools not hands', 'Inspect before use'] },
    { title: 'Electrical Safety', points: ['Lock out/Tag out', 'Test before touch', 'Qualified persons only', 'Report damaged cords'] },
    { title: 'Housekeeping', points: ['Clean as you go', 'Clear walkways', 'Proper waste disposal', 'Secure materials'] },
    { title: 'Lifting Operations', points: ['Plan the lift', 'Inspect rigging', 'Clear the drop zone', 'Communication signals'] },
    { title: 'Fire Prevention', points: ['Hot work permit', 'Fire watch assigned', 'Extinguisher nearby', 'Clear combustibles'] },
    { title: 'Slip, Trip, Fall Prevention', points: ['Report spills immediately', 'Use handrails', 'Watch your step', 'Proper footwear'] },
    { title: 'PPE Compliance', points: ['Inspect before use', 'Proper fit matters', 'Task-specific selection', 'Replace when damaged'] },
    { title: 'Excavation Safety', points: ['Call before you dig', 'Inspect daily', 'Sloping/shoring required', 'Keep materials back'] },
    { title: 'Chemical Handling', points: ['Read the SDS', 'Proper PPE required', 'Know spill procedures', 'Secondary containment'] }
  ];

  let meetingTimerInterval = null;
  let meetingTimerSeconds = 300;
  let meetingTimerRunning = false;

  function openToolFullView(toolId) {
    const toolsGrid = $('#toolsGrid');
    const fullView = $('#toolsFullView');
    const fullViewContent = $('#toolsFullViewContent');
    
    if (!toolsGrid || !fullView || !fullViewContent) return;
    
    if (toolId === 'excavation') {
      openTab(null, 'ExcavationTab');
      loadExcavationDashboard();
      return;
    }
    
    toolsGrid.style.display = 'none';
    
    const existingSections = ['trainingMatrix', 'heatStress', 'windSpeed', 'riskMatrix', 'lifeSaving', 'challenges', 'quiz', 'ppeGuide', 'noiseLevel', 'safetyCalendar'];
    existingSections.forEach(s => {
      const el = document.getElementById(s + 'Section');
      if (el) el.style.display = 'none';
    });
    
    if (existingSections.includes(toolId)) {
      const section = document.getElementById(toolId + 'Section');
      if (section) {
        fullViewContent.innerHTML = '';
        if (toolId === 'safetyCalendar') {
          fullViewContent.appendChild(section);
          section.style.display = 'block';
        } else {
          fullViewContent.appendChild(section.cloneNode(true));
          fullViewContent.querySelector('.tool-section').style.display = 'block';
        }
      }
      if (toolId === 'challenges') loadChallenges();
      if (toolId === 'noiseLevel') initNoiseLevel();
      if (toolId === 'trainingMatrix') {
        const clonedSelect = fullViewContent.querySelector('#trainingRoleSelect');
        if (clonedSelect) {
          clonedSelect.addEventListener('change', loadTrainingsForRole);
          fetch('/api/training-roles')
            .then(res => res.json())
            .then(roles => {
              clonedSelect.innerHTML = '<option value="">-- Choose a Role --</option>';
              roles.forEach(role => {
                clonedSelect.innerHTML += `<option value="${role.id}">${role.name}</option>`;
              });
            })
            .catch(e => console.error('Error loading training roles:', e));
        }
      }
    } else if (NEW_TOOLS_CONTENT[toolId]) {
      const tool = NEW_TOOLS_CONTENT[toolId];
      fullViewContent.innerHTML = '<div class="tool-section" style="display:block;"><h3><i class="fas ' + tool.icon + '"></i> ' + tool.title + '</h3>' + tool.content + '</div>';
      if (toolId === 'safetyMeetingTimer') initMeetingTimer();
      if (toolId === 'firstAidKit') initFirstAidChecklist();
      if (toolId === 'handSignals') initHandSignals();
      if (toolId === 'firstAidGuide') initFirstAidGuide();
      if (toolId === 'safetyLimits') initSafetyLimits();
      if (toolId === 'adaptiveLearning') initAdaptiveLearning();
      if (toolId === 'safetySigns') initSafetySigns();
    }
    
    fullView.style.display = 'block';
    fullView.scrollIntoView({ behavior: 'smooth' });
  }
  window.openToolFullView = openToolFullView;

  function closeToolFullView() {
    const toolsGrid = $('#toolsGrid');
    const fullView = $('#toolsFullView');
    const fullViewContent = $('#toolsFullViewContent');
    
    const calendarSection = document.getElementById('safetyCalendarSection');
    if (calendarSection && fullViewContent && fullViewContent.contains(calendarSection)) {
      const toolsTab = document.getElementById('ToolsTab');
      if (toolsTab) {
        calendarSection.style.display = 'none';
        toolsTab.appendChild(calendarSection);
      }
    }
    
    if (toolsGrid) toolsGrid.style.display = 'grid';
    if (fullView) fullView.style.display = 'none';
    
    if (meetingTimerInterval) {
      clearInterval(meetingTimerInterval);
      meetingTimerInterval = null;
    }
    if (isListening) stopNoiseMeasurement();
  }
  window.closeToolFullView = closeToolFullView;

  function updateWhyChain() {
    const why5 = $('#why5')?.value;
    const rootSection = $('#rootCauseSection');
    const rootDisplay = $('#rootCauseDisplay');
    
    if (why5 && why5.trim() && rootSection && rootDisplay) {
      rootSection.style.display = 'block';
      rootDisplay.textContent = why5;
    } else if (rootSection) {
      rootSection.style.display = 'none';
    }
  }
  window.updateWhyChain = updateWhyChain;

  function clearFiveWhys() {
    ['incidentDescription', 'why1', 'why2', 'why3', 'why4', 'why5', 'correctiveAction'].forEach(id => {
      const el = $('#' + id);
      if (el) el.value = '';
    });
    const rootSection = $('#rootCauseSection');
    if (rootSection) rootSection.style.display = 'none';
  }
  window.clearFiveWhys = clearFiveWhys;

  function updateFirstAidCount() {
    const checkboxes = document.querySelectorAll('#firstAidItems input[type="checkbox"]');
    const checked = document.querySelectorAll('#firstAidItems input[type="checkbox"]:checked').length;
    const total = checkboxes.length;
    
    const countEl = $('#checkedCount');
    const totalEl = $('#totalCount');
    const statusEl = $('#firstAidStatus');
    
    if (countEl) countEl.textContent = checked;
    if (totalEl) totalEl.textContent = total;
    
    if (statusEl) {
      if (checked === total) {
        statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e;"></i> <span style="color:#22c55e;">First Aid Kit is COMPLETE and compliant!</span>';
      } else if (checked >= total * 0.8) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#f59e0b;"></i> <span style="color:#f59e0b;">Almost complete - ' + (total - checked) + ' items missing</span>';
      } else {
        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> <span style="color:#ef4444;">' + (total - checked) + ' items missing - Kit is NOT compliant</span>';
      }
    }
  }
  window.updateFirstAidCount = updateFirstAidCount;

  function initFirstAidChecklist() {
    setTimeout(() => {
      const checkboxes = document.querySelectorAll('#firstAidItems input[type="checkbox"]');
      const totalEl = $('#totalCount');
      if (totalEl) totalEl.textContent = checkboxes.length;
      updateFirstAidCount();
    }, 100);
  }

  function resetFirstAidChecklist() {
    const checkboxes = document.querySelectorAll('#firstAidItems input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateFirstAidCount();
  }
  window.resetFirstAidChecklist = resetFirstAidChecklist;

  // ========== HAND SIGNALS REFERENCE GUIDE ==========
  const HAND_SIGNALS_DATA = {
    crane: [
      { name: 'Hoist (Raise Load)', icon: 'fa-arrow-up', description: 'Point index finger up and rotate hand in small circles', color: '#22c55e' },
      { name: 'Lower Load', icon: 'fa-arrow-down', description: 'Point index finger down and rotate hand in small circles', color: '#3b82f6' },
      { name: 'Stop', icon: 'fa-hand-paper', description: 'Arm extended, palm down, move arm back and forth horizontally', color: '#ef4444' },
      { name: 'Emergency Stop', icon: 'fa-stop-circle', description: 'Both arms extended, palms down, move arms back and forth', color: '#dc2626' },
      { name: 'Boom Up', icon: 'fa-angle-double-up', description: 'Arm extended, thumb pointing up, fingers closed', color: '#f59e0b' },
      { name: 'Boom Down', icon: 'fa-angle-double-down', description: 'Arm extended, thumb pointing down, fingers closed', color: '#f59e0b' },
      { name: 'Swing Left', icon: 'fa-arrow-left', description: 'Arm extended, point with finger in direction of swing', color: '#8b5cf6' },
      { name: 'Swing Right', icon: 'fa-arrow-right', description: 'Arm extended, point with finger in direction of swing', color: '#8b5cf6' },
      { name: 'Travel/Move Crane', icon: 'fa-truck', description: 'Arm extended forward, hand open, making pushing motion', color: '#06b6d4' },
      { name: 'Dog Everything', icon: 'fa-pause-circle', description: 'Clasp hands in front of body - hold position', color: '#6b7280' },
      { name: 'Extend Boom', icon: 'fa-expand-arrows-alt', description: 'Both fists in front of body, thumbs pointing outward', color: '#10b981' },
      { name: 'Retract Boom', icon: 'fa-compress-arrows-alt', description: 'Both fists in front of body, thumbs pointing inward', color: '#10b981' }
    ],
    rigger: [
      { name: 'All Clear', icon: 'fa-thumbs-up', description: 'Thumbs up signal - load secured, ready to lift', color: '#22c55e' },
      { name: 'Wait/Hold', icon: 'fa-hand-paper', description: 'Open palm facing forward - pause operation', color: '#f59e0b' },
      { name: 'Take Slack', icon: 'fa-link', description: 'Arm extended, hand closed, thumb up with slight jerking motion', color: '#3b82f6' },
      { name: 'Move Slowly', icon: 'fa-tachometer-alt', description: 'Place one hand motionless over the hand giving signal', color: '#8b5cf6' },
      { name: 'Land Load', icon: 'fa-download', description: 'Arm extended, palm down, lower slowly then stop', color: '#06b6d4' },
      { name: 'Use Main Hoist', icon: 'fa-fist-raised', description: 'Tap fist on head, then give regular signal', color: '#ec4899' },
      { name: 'Use Whip Line', icon: 'fa-hand-point-up', description: 'Tap elbow with one hand, then give regular signal', color: '#ec4899' },
      { name: 'Load Secured', icon: 'fa-lock', description: 'Both arms crossed over chest', color: '#22c55e' }
    ],
    traffic: [
      { name: 'Stop All Traffic', icon: 'fa-hand-paper', description: 'Arm raised, palm facing traffic', color: '#ef4444' },
      { name: 'Proceed', icon: 'fa-walking', description: 'Arm extended, beckoning motion toward body', color: '#22c55e' },
      { name: 'Slow Down', icon: 'fa-minus', description: 'Arm extended, palm down, pressing downward motion', color: '#f59e0b' },
      { name: 'Turn Left', icon: 'fa-arrow-left', description: 'Left arm extended, pointing left with sweeping motion', color: '#3b82f6' },
      { name: 'Turn Right', icon: 'fa-arrow-right', description: 'Right arm extended, pointing right with sweeping motion', color: '#3b82f6' },
      { name: 'Back Up', icon: 'fa-backward', description: 'Both arms bent at elbow, palms facing forward, pushing motion', color: '#8b5cf6' },
      { name: 'Come Forward', icon: 'fa-forward', description: 'Arms bent at elbow, palms facing body, pulling motion', color: '#06b6d4' },
      { name: 'Cut Engine', icon: 'fa-power-off', description: 'Draw finger across throat', color: '#dc2626' }
    ]
  };
  let currentSignalCategory = 'crane';

  function initHandSignals() {
    currentSignalCategory = 'crane';
    renderSignalCards();
  }

  function switchSignalCategory(category) {
    currentSignalCategory = category;
    document.querySelectorAll('.signal-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderSignalCards();
  }
  window.switchSignalCategory = switchSignalCategory;

  function renderSignalCards() {
    const container = document.getElementById('signalCardsContainer');
    if (!container) return;
    const signals = HAND_SIGNALS_DATA[currentSignalCategory] || [];
    container.innerHTML = signals.map((s, i) => `
      <div class="signal-card" onclick="showSignalDetail(${i})" style="border-left: 4px solid ${s.color}">
        <div class="signal-icon" style="background: ${s.color}20; color: ${s.color}"><i class="fas ${s.icon}"></i></div>
        <div class="signal-info">
          <div class="signal-name">${s.name}</div>
          <div class="signal-desc">${s.description}</div>
        </div>
        <button class="signal-print-btn" onclick="event.stopPropagation(); printSignal(${i})"><i class="fas fa-print"></i></button>
      </div>
    `).join('');
  }

  function showSignalDetail(index) {
    const signals = HAND_SIGNALS_DATA[currentSignalCategory] || [];
    const s = signals[index];
    if (!s) return;
    showToast(s.name + ': ' + s.description, 'info');
  }
  window.showSignalDetail = showSignalDetail;

  function printSignal(index) {
    const signals = HAND_SIGNALS_DATA[currentSignalCategory] || [];
    const s = signals[index];
    if (!s) return;
    const userName = currentUser?.name || 'Safety Officer';
    const userId = currentUser?.employee_id || 'N/A';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>${s.name} - Hand Signal</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; }
        .header { display: flex; align-items: center; gap: 15px; border-bottom: 3px solid #0369a1; padding-bottom: 15px; margin-bottom: 25px; }
        .header img { width: 60px; height: 60px; border-radius: 8px; }
        .header-text { flex: 1; }
        .header-text h2 { color: #0369a1; margin: 0 0 4px 0; font-size: 20px; }
        .header-text p { color: #64748b; margin: 0; font-size: 12px; }
        .header-info { text-align: right; font-size: 11px; color: #475569; }
        .header-info .name { font-weight: 600; color: #1e293b; }
        .signal-box { border: 3px solid ${s.color}; padding: 40px; border-radius: 12px; max-width: 400px; margin: 0 auto; text-align: center; }
        .icon { font-size: 80px; color: ${s.color}; margin-bottom: 20px; }
        h1 { color: #1e3a5f; margin-bottom: 20px; }
        p { font-size: 18px; color: #333; line-height: 1.6; }
        .category-tag { display: inline-block; margin-top: 15px; padding: 5px 15px; background: ${s.color}15; color: ${s.color}; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
      </head><body>
      <div class="header">
        <img src="${window.location.origin}/img/CAT.jpeg" onerror="this.style.display='none'">
        <div class="header-text"><h2>Safety Observer</h2><p>Saudi Safety Group - Aramco CAT Project</p></div>
        <div class="header-info"><div class="name">${userName}</div><div>ID: ${userId}</div><div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div></div>
      </div>
      <div class="signal-box">
        <div class="icon"><i class="fas ${s.icon}"></i></div>
        <h1>${s.name}</h1>
        <p>${s.description}</p>
        <div class="category-tag">${currentSignalCategory.charAt(0).toUpperCase() + currentSignalCategory.slice(1)} Signal</div>
      </div>
      <div class="footer">Post this signal in visible locations as required by safety regulations</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }
  window.printSignal = printSignal;

  function printAllSignals() {
    const signals = HAND_SIGNALS_DATA[currentSignalCategory] || [];
    const userName = currentUser?.name || 'Safety Officer';
    const userId = currentUser?.employee_id || 'N/A';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>${currentSignalCategory.charAt(0).toUpperCase() + currentSignalCategory.slice(1)} Hand Signals</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
        .header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #0369a1; padding-bottom: 12px; margin-bottom: 15px; }
        .header img { width: 50px; height: 50px; border-radius: 8px; }
        .header-text { flex: 1; }
        .header-text h2 { color: #0369a1; margin: 0 0 3px 0; font-size: 18px; }
        .header-text p { color: #64748b; margin: 0; font-size: 10px; }
        .header-info { text-align: right; font-size: 10px; color: #475569; }
        .header-info .name { font-weight: 600; color: #1e293b; }
        h1 { text-align: center; color: #1e3a5f; font-size: 16px; margin: 15px 0; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .card { border: 2px solid #ddd; padding: 12px; border-radius: 8px; page-break-inside: avoid; }
        .card h3 { margin: 0 0 8px 0; color: #1e3a5f; font-size: 12px; }
        .card p { margin: 0; font-size: 10px; color: #333; line-height: 1.4; }
        .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media print { .grid { grid-template-columns: repeat(2, 1fr); } }
      </style>
      </head><body>
      <div class="header">
        <img src="${window.location.origin}/img/CAT.jpeg" onerror="this.style.display='none'">
        <div class="header-text"><h2>Safety Observer</h2><p>Saudi Safety Group - Aramco CAT Project</p></div>
        <div class="header-info"><div class="name">${userName}</div><div>ID: ${userId}</div><div>${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div></div>
      </div>
      <h1>${currentSignalCategory.charAt(0).toUpperCase() + currentSignalCategory.slice(1)} Hand Signals Reference</h1>
      <div class="grid">
        ${signals.map(s => `<div class="card"><h3>${s.name}</h3><p>${s.description}</p></div>`).join('')}
      </div>
      <div class="footer">Printed by: ${userName} (ID: ${userId}) | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }
  window.printAllSignals = printAllSignals;

  // ========== FIRST AID RESPONSE GUIDE ==========
  const FIRST_AID_SCENARIOS = [
    { id: 'cpr', name: 'CPR / Cardiac Arrest', icon: 'fa-heartbeat', category: 'life', color: '#ef4444',
      steps: ['Call for emergency help immediately', 'Place victim on firm, flat surface', 'Start chest compressions: 30 compressions at 2 inches deep', 'Give 2 rescue breaths (if trained)', 'Continue 30:2 ratio until help arrives', 'Use AED if available'],
      warnings: ['Do not stop compressions unless relieved or exhausted', 'Push hard and fast - 100-120 compressions/min'] },
    { id: 'choking', name: 'Choking', icon: 'fa-lungs', category: 'life', color: '#dc2626',
      steps: ['Ask "Are you choking?" - if they cannot speak, act immediately', 'Stand behind victim, wrap arms around waist', 'Make fist with one hand, place above navel', 'Grasp fist with other hand', 'Give quick upward thrusts', 'Repeat until object is expelled'],
      warnings: ['For pregnant/obese: use chest thrusts instead', 'If unconscious: start CPR'] },
    { id: 'burns', name: 'Burns', icon: 'fa-fire', category: 'injury', color: '#f59e0b',
      steps: ['Remove victim from heat source', 'Cool burn with cool running water for 10-20 minutes', 'Remove jewelry/clothing near burn (if not stuck)', 'Cover with sterile, non-stick dressing', 'Do NOT apply ice, butter, or creams', 'Seek medical attention for severe burns'],
      warnings: ['Chemical burns: flush with water for 20+ minutes', 'Electrical burns: ensure power is off first'] },
    { id: 'cuts', name: 'Severe Bleeding / Cuts', icon: 'fa-tint', category: 'injury', color: '#dc2626',
      steps: ['Apply direct pressure with clean cloth', 'Keep pressure for at least 15 minutes', 'Elevate injured limb above heart if possible', 'Add more cloth if blood soaks through (do not remove)', 'Apply tourniquet only if life-threatening and trained', 'Call emergency services for severe bleeding'],
      warnings: ['Do not remove embedded objects', 'Watch for signs of shock'] },
    { id: 'fractures', name: 'Fractures / Broken Bones', icon: 'fa-bone', category: 'injury', color: '#8b5cf6',
      steps: ['Do not move the victim unless necessary', 'Immobilize the injured area', 'Apply ice pack wrapped in cloth', 'Check for circulation beyond injury', 'Splint if trained and transport is delayed', 'Seek immediate medical attention'],
      warnings: ['Never try to straighten a broken bone', 'Watch for compound fractures (bone through skin)'] },
    { id: 'heat', name: 'Heat Stroke', icon: 'fa-thermometer-full', category: 'environmental', color: '#f97316',
      steps: ['Move victim to cool, shaded area', 'Call emergency services immediately', 'Remove excess clothing', 'Cool with water, wet cloths, or fanning', 'Apply ice packs to neck, armpits, groin', 'Give small sips of water if conscious'],
      warnings: ['Heat stroke is life-threatening', 'Body temp may exceed 104°F (40°C)'] },
    { id: 'electric', name: 'Electric Shock', icon: 'fa-bolt', category: 'injury', color: '#eab308',
      steps: ['Do NOT touch victim if still in contact with power', 'Turn off power source or use non-conductive object', 'Call emergency services', 'Check breathing and pulse', 'Start CPR if needed', 'Treat visible burns', 'Monitor for shock'],
      warnings: ['Electricity can cause internal injuries not visible', 'Victim may have entry and exit wounds'] },
    { id: 'eye', name: 'Eye Injuries', icon: 'fa-eye', category: 'injury', color: '#06b6d4',
      steps: ['Do NOT rub the eye', 'For chemicals: flush with clean water for 15-20 minutes', 'For objects: do not remove embedded objects', 'Cover both eyes loosely to prevent movement', 'Seek immediate medical attention', 'For dust/debris: try to blink and use eye wash'],
      warnings: ['Never apply pressure to injured eye', 'Chemical burns require extended flushing'] },
    { id: 'hypothermia', name: 'Hypothermia', icon: 'fa-snowflake', category: 'environmental', color: '#3b82f6',
      steps: ['Move victim to warm, dry area', 'Remove wet clothing', 'Wrap in blankets, cover head', 'Give warm (not hot) drinks if conscious', 'Apply warm compresses to chest, neck, groin', 'Handle gently - sudden movements can cause heart problems'],
      warnings: ['Do not rub limbs', 'Do not give alcohol', 'Do not use direct heat'] },
    { id: 'h2s', name: 'H2S Exposure', icon: 'fa-skull-crossbones', category: 'environmental', color: '#7c3aed',
      steps: ['Remove victim from contaminated area (use SCBA)', 'Call emergency services immediately', 'If not breathing, start CPR with barrier device', 'Administer oxygen if available and trained', 'Keep victim warm and calm', 'Monitor vital signs continuously'],
      warnings: ['Do not enter without proper respiratory protection', 'H2S can cause rapid unconsciousness'] }
  ];
  let currentFACategory = 'all';

  function initFirstAidGuide() {
    currentFACategory = 'all';
    renderFirstAidScenarios();
  }

  function switchFirstAidCategory(category) {
    currentFACategory = category;
    document.querySelectorAll('.fa-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderFirstAidScenarios();
  }
  window.switchFirstAidCategory = switchFirstAidCategory;

  function renderFirstAidScenarios() {
    const container = document.getElementById('firstAidScenariosContainer');
    if (!container) return;
    const filtered = currentFACategory === 'all' ? FIRST_AID_SCENARIOS : FIRST_AID_SCENARIOS.filter(s => s.category === currentFACategory);
    container.innerHTML = filtered.map(s => `
      <div class="fa-scenario-card" onclick="showFirstAidDetail('${s.id}')" style="border-left: 4px solid ${s.color}">
        <div class="fa-scenario-icon" style="background: ${s.color}20; color: ${s.color}"><i class="fas ${s.icon}"></i></div>
        <div class="fa-scenario-info">
          <div class="fa-scenario-name">${s.name}</div>
          <div class="fa-scenario-steps">${s.steps.length} steps</div>
        </div>
        <i class="fas fa-chevron-right fa-scenario-arrow"></i>
      </div>
    `).join('');
  }

  function showFirstAidDetail(id) {
    const scenario = FIRST_AID_SCENARIOS.find(s => s.id === id);
    if (!scenario) return;
    const modal = document.createElement('div');
    modal.className = 'fa-detail-modal';
    modal.innerHTML = `
      <div class="fa-detail-content">
        <button class="fa-detail-close" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button>
        <div class="fa-detail-header" style="background: ${scenario.color}">
          <i class="fas ${scenario.icon}"></i>
          <h3>${scenario.name}</h3>
        </div>
        <div class="fa-detail-body">
          <h4><i class="fas fa-list-ol"></i> Steps to Follow:</h4>
          <ol class="fa-steps-list">
            ${scenario.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>
          <h4><i class="fas fa-exclamation-triangle"></i> Important Warnings:</h4>
          <ul class="fa-warnings-list">
            ${scenario.warnings.map(w => `<li><i class="fas fa-exclamation-triangle warning-icon"></i>${w}</li>`).join('')}
          </ul>
        </div>
        <button class="pro-btn primary" onclick="printFirstAidScenario('${id}')" style="margin-top:1rem;width:100%;"><i class="fas fa-print"></i> Print This Guide</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  window.showFirstAidDetail = showFirstAidDetail;

  function printFirstAidScenario(id) {
    const scenario = FIRST_AID_SCENARIOS.find(s => s.id === id);
    if (!scenario) return;
    const userName = currentUser?.name || 'Safety Officer';
    const userId = currentUser?.employee_id || 'N/A';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>${scenario.name} - First Aid Guide</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 15px; margin-bottom: 20px; }
        .header h2 { color: #1e3a5f; margin: 10px 0 5px; }
        .header p { color: #666; font-size: 12px; margin: 0; }
        h1 { color: ${scenario.color}; text-align: center; margin: 20px 0; }
        h2 { color: #333; margin-top: 25px; font-size: 16px; }
        ol { line-height: 2; padding-left: 25px; }
        ol li { margin-bottom: 8px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; margin: 10px 0; border-radius: 4px; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>
      <div class="header">
        <h2>Safety Observer</h2>
        <p>Saudi Safety Group - Aramco CAT Project</p>
      </div>
      <h1>${scenario.name}</h1>
      <h2>Steps to Follow:</h2>
      <ol>${scenario.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      <h2>Important Warnings:</h2>
      ${scenario.warnings.map(w => `<div class="warning">${w}</div>`).join('')}
      <div class="footer">
        <p>Printed by: ${userName} (ID: ${userId}) | Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        <p>Post this guide in first aid stations for quick reference</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }
  window.printFirstAidScenario = printFirstAidScenario;

  // ========== SAFETY LIMITS QUICK REFERENCE ==========
  const SAFETY_LIMITS_DATA = [
    { category: 'distance', title: 'Ladder Placement', value: '1:4 ratio', detail: 'Base 1 foot away for every 4 feet of height', source: 'OSHA 1926.1053' },
    { category: 'distance', title: 'Excavation Ladder Spacing', value: '25 ft max', detail: 'Ladders must be within 25 feet of workers in excavations over 4ft deep', source: 'OSHA 1926.651' },
    { category: 'distance', title: 'Gas Cylinder Separation', value: '20 ft / 5 ft wall', detail: 'Oxygen and fuel gas cylinders must be 20ft apart or separated by 5ft fire-resistant barrier', source: 'OSHA 1926.350' },
    { category: 'distance', title: 'Flammable Storage', value: '50 ft from ignition', detail: 'Flammable materials must be stored 50 feet from ignition sources', source: 'NFPA 30' },
    { category: 'distance', title: 'Fire Extinguisher Access', value: '75 ft travel', detail: 'Maximum travel distance to fire extinguisher', source: 'OSHA 1926.150' },
    { category: 'distance', title: 'Guardrail Height', value: '42 inches', detail: 'Top rail height for fall protection systems', source: 'OSHA 1926.502' },
    { category: 'distance', title: 'Floor Hole Cover', value: '2 inches+', detail: 'Holes 2 inches or more must be covered or guarded', source: 'OSHA 1926.502' },
    { category: 'distance', title: 'Power Line Clearance', value: '10-35 ft', detail: '10ft for <50kV, add 4 inches per 10kV above 50kV', source: 'OSHA 1926.1408' },
    { category: 'time', title: 'Hot Work Permit', value: '24 hours max', detail: 'Hot work permits valid for maximum 24 hours', source: 'Aramco CSM' },
    { category: 'time', title: 'Confined Space Air Testing', value: 'Before + continuous', detail: 'Test atmosphere before entry and continuously during work', source: 'OSHA 1910.146' },
    { category: 'time', title: 'Fire Watch Duration', value: '30-60 min after', detail: 'Fire watch must remain 30-60 minutes after hot work completion', source: 'NFPA 51B' },
    { category: 'time', title: 'Incident Reporting', value: '24 hours', detail: 'Report all incidents within 24 hours to supervisor', source: 'Aramco CSM' },
    { category: 'time', title: 'First Aid Kit Inspection', value: 'Weekly', detail: 'Inspect first aid kits at least weekly', source: 'OSHA 1926.50' },
    { category: 'pressure', title: 'Cylinder Pressure Test', value: '5 years', detail: 'Compressed gas cylinders must be retested every 5 years', source: 'DOT 49 CFR' },
    { category: 'pressure', title: 'Air Compressor Relief', value: '150 PSI typical', detail: 'Relief valve setting per manufacturer, typically 150 PSI for portable units', source: 'OSHA 1926.302' },
    { category: 'pressure', title: 'Hydraulic Hose Inspection', value: 'Daily', detail: 'Inspect hydraulic hoses daily for damage, leaks, abrasion', source: 'Aramco CSM' },
    { category: 'pressure', title: 'Heat Index Danger', value: '103°F+', detail: 'Extreme caution required when heat index exceeds 103°F', source: 'OSHA/NIOSH' },
    { category: 'pressure', title: 'Noise Exposure Limit', value: '85 dB / 8 hrs', detail: 'Hearing protection required at or above 85 dB for 8-hour exposure', source: 'OSHA 1910.95' },
    { category: 'ppe', title: 'Hard Hat Replacement', value: '5 years max', detail: 'Replace hard hat shell every 5 years, suspension every 12 months', source: 'ANSI Z89.1' },
    { category: 'ppe', title: 'Safety Glasses Rating', value: 'Z87.1+', detail: 'Safety glasses must meet ANSI Z87.1 impact rating', source: 'OSHA 1926.102' },
    { category: 'ppe', title: 'Fall Protection Trigger', value: '6 ft / 4 ft', detail: '6 feet in construction, 4 feet in general industry', source: 'OSHA 1926.501' },
    { category: 'ppe', title: 'Harness Inspection', value: 'Before each use', detail: 'Inspect fall protection harness before each use', source: 'OSHA 1926.502' },
    { category: 'ppe', title: 'Glove Selection', value: 'Task-specific', detail: 'Cut-resistant for sharp objects, chemical-resistant for chemicals, heat-resistant for hot work', source: 'OSHA 1926.95' },
    { category: 'ppe', title: 'Respirator Fit Test', value: 'Annual', detail: 'Fit testing required annually and when respirator/face changes', source: 'OSHA 1910.134' }
  ];
  let currentLimitsCategory = 'all';

  function initSafetyLimits() {
    currentLimitsCategory = 'all';
    renderSafetyLimits();
  }

  function switchLimitsCategory(category) {
    currentLimitsCategory = category;
    document.querySelectorAll('.limits-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderSafetyLimits();
  }
  window.switchLimitsCategory = switchLimitsCategory;

  function filterSafetyLimits() {
    renderSafetyLimits();
  }
  window.filterSafetyLimits = filterSafetyLimits;

  function renderSafetyLimits() {
    const container = document.getElementById('safetyLimitsContainer');
    const searchInput = document.getElementById('limitsSearchInput');
    if (!container) return;
    const search = (searchInput?.value || '').toLowerCase();
    let filtered = currentLimitsCategory === 'all' ? SAFETY_LIMITS_DATA : SAFETY_LIMITS_DATA.filter(l => l.category === currentLimitsCategory);
    if (search) {
      filtered = filtered.filter(l => l.title.toLowerCase().includes(search) || l.detail.toLowerCase().includes(search));
    }
    const categoryColors = { distance: '#3b82f6', time: '#22c55e', pressure: '#f59e0b', ppe: '#8b5cf6' };
    container.innerHTML = filtered.length ? filtered.map(l => `
      <div class="safety-limit-card">
        <div class="limit-category-tag" style="background: ${categoryColors[l.category]}20; color: ${categoryColors[l.category]}">${l.category}</div>
        <div class="limit-title">${l.title}</div>
        <div class="limit-value">${l.value}</div>
        <div class="limit-detail">${l.detail}</div>
        <div class="limit-source"><i class="fas fa-book"></i> ${l.source}</div>
      </div>
    `).join('') : '<div class="no-data">No limits found matching your search</div>';
  }

  // ========== ADAPTIVE LEARNING MODE ==========
  function initAdaptiveLearning() {
    loadAdaptiveDrills();
  }

  async function loadAdaptiveDrills() {
    const statsContainer = document.getElementById('adaptiveLearningStats');
    const drillContainer = document.getElementById('adaptiveDrillContainer');
    const emptyState = document.getElementById('adaptiveEmptyState');
    if (!drillContainer) return;
    
    if (!authToken || !currentUser) {
      if (emptyState) {
        emptyState.innerHTML = `
          <i class="fas fa-sign-in-alt"></i>
          <h4>Login Required</h4>
          <p>Please log in to access your personalized learning drills.</p>
        `;
        emptyState.style.display = 'block';
      }
      if (statsContainer) statsContainer.style.display = 'none';
      if (drillContainer) drillContainer.style.display = 'none';
      return;
    }
    
    try {
      const res = await fetch('/api/quiz/history', { headers: { 'Authorization': `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Not logged in');
      const history = await res.json();
      
      const wrongAnswers = [];
      history.forEach(h => {
        try {
          const answers = JSON.parse(h.answers || '[]');
          answers.forEach(a => { if (!a.is_correct) wrongAnswers.push(a); });
        } catch(e) {}
      });
      
      if (wrongAnswers.length === 0) {
        if (statsContainer) statsContainer.style.display = 'none';
        if (drillContainer) drillContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }
      
      if (emptyState) emptyState.style.display = 'none';
      if (statsContainer) {
        statsContainer.style.display = 'block';
        statsContainer.innerHTML = `
          <div class="adaptive-stat"><span class="stat-num">${wrongAnswers.length}</span><span class="stat-label">Questions to Review</span></div>
          <div class="adaptive-stat"><span class="stat-num">${history.length}</span><span class="stat-label">Quizzes Completed</span></div>
        `;
      }
      
      const uniqueQuestions = [...new Map(wrongAnswers.map(w => [w.question_id, w])).values()].slice(0, 5);
      
      const questionIds = uniqueQuestions.map(q => q.question_id);
      const questionsRes = await fetch('/api/quiz/questions/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ ids: questionIds })
      });
      
      if (questionsRes.ok) {
        const questions = await questionsRes.json();
        if (drillContainer) {
          drillContainer.style.display = 'block';
          if (questions && questions.length > 0) {
            drillContainer.innerHTML = `
              <h4><i class="fas fa-redo"></i> Practice These Questions:</h4>
              ${questions.map((q, i) => `
                <div class="adaptive-question-card">
                  <div class="aq-number">${i + 1}</div>
                  <div class="aq-content">
                    <div class="aq-text">${q.question}</div>
                    <div class="aq-options">
                      <div class="aq-option" onclick="checkAdaptiveAnswer(this, '${q.correct_answer}', 'A')">A. ${q.option_a}</div>
                      <div class="aq-option" onclick="checkAdaptiveAnswer(this, '${q.correct_answer}', 'B')">B. ${q.option_b}</div>
                      <div class="aq-option" onclick="checkAdaptiveAnswer(this, '${q.correct_answer}', 'C')">C. ${q.option_c}</div>
                      <div class="aq-option" onclick="checkAdaptiveAnswer(this, '${q.correct_answer}', 'D')">D. ${q.option_d}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            `;
          } else {
            drillContainer.innerHTML = '<p class="no-data">Questions no longer available in database. Complete more quizzes to see new practice questions.</p>';
          }
        }
      } else {
        if (drillContainer) drillContainer.innerHTML = '<p class="no-data">Unable to load practice questions. Try again later.</p>';
      }
    } catch(e) {
      console.error('Adaptive learning error:', e);
      if (emptyState) {
        emptyState.innerHTML = `
          <i class="fas fa-sign-in-alt"></i>
          <h4>Login Required</h4>
          <p>Please log in to access your personalized learning drills.</p>
        `;
        emptyState.style.display = 'block';
      }
      if (statsContainer) statsContainer.style.display = 'none';
      if (drillContainer) drillContainer.style.display = 'none';
    }
  }

  function checkAdaptiveAnswer(el, correct, selected) {
    const options = el.parentElement.querySelectorAll('.aq-option');
    options.forEach(o => {
      o.classList.remove('correct', 'incorrect');
      o.style.pointerEvents = 'none';
    });
    if (selected === correct) {
      el.classList.add('correct');
      showToast('Correct!', 'success');
    } else {
      el.classList.add('incorrect');
      options.forEach(o => { if (o.textContent.startsWith(correct + '.')) o.classList.add('correct'); });
      showToast('Incorrect. The correct answer is ' + correct, 'error');
    }
  }
  window.checkAdaptiveAnswer = checkAdaptiveAnswer;

  // ========== SAFETY SIGNS REFERENCE ==========
  const SAFETY_SIGNS_DATA = [
    // WARNING SIGNS (Yellow triangle/diamond)
    { id: 'w1', category: 'warning', name: 'Flammable Material', icon: 'fa-fire', meaning: 'Flammable materials are present. Keep away from heat, sparks, open flames, and hot surfaces. No smoking.', keywords: 'fire flame burn' },
    { id: 'w2', category: 'warning', name: 'Toxic/Poison', icon: 'fa-skull-crossbones', meaning: 'Toxic substances present. May cause death or serious injury if inhaled, swallowed, or absorbed through skin.', keywords: 'poison death chemical' },
    { id: 'w3', category: 'warning', name: 'High Voltage', icon: 'fa-bolt', meaning: 'Danger of electric shock. Only authorized personnel may enter. Keep clear of electrical equipment.', keywords: 'electric shock electricity' },
    { id: 'w4', category: 'warning', name: 'Slippery Surface', icon: 'fa-person-falling', meaning: 'Slippery surface when wet. Walk carefully and use handrails where available.', keywords: 'slip fall wet' },
    { id: 'w5', category: 'warning', name: 'Hot Surface', icon: 'fa-temperature-high', meaning: 'Hot surfaces present. Do not touch without proper protection. Allow to cool before handling.', keywords: 'heat burn steam' },
    { id: 'w6', category: 'warning', name: 'Overhead Crane', icon: 'fa-truck-loading', meaning: 'Overhead crane in operation. Do not stand under suspended loads. Follow crane operator signals.', keywords: 'crane lift load' },
    { id: 'w7', category: 'warning', name: 'Forklift Traffic', icon: 'fa-truck', meaning: 'Forklift trucks operating in this area. Pedestrians must use designated walkways only.', keywords: 'forklift vehicle traffic' },
    { id: 'w8', category: 'warning', name: 'Falling Objects', icon: 'fa-helmet-safety', meaning: 'Danger of falling objects. Hard hat required at all times in this area.', keywords: 'fall drop head' },
    { id: 'w9', category: 'warning', name: 'Compressed Gas', icon: 'fa-compress', meaning: 'Compressed gas cylinders present. Handle with care. Secure cylinders upright at all times.', keywords: 'cylinder pressure gas' },
    { id: 'w10', category: 'warning', name: 'Corrosive Material', icon: 'fa-flask', meaning: 'Corrosive substances present. May cause severe burns to skin and eyes. Wear appropriate PPE.', keywords: 'acid burn chemical' },
    { id: 'w11', category: 'warning', name: 'Radiation', icon: 'fa-radiation', meaning: 'Ionizing radiation present. Authorized personnel only. Use dosimeter and follow safety protocols.', keywords: 'radioactive nuclear' },
    { id: 'w12', category: 'warning', name: 'Explosive Material', icon: 'fa-bomb', meaning: 'Explosive materials present. No naked flames, sparks, or unauthorized entry.', keywords: 'explosion blast bomb' },
    { id: 'w13', category: 'warning', name: 'Laser Beam', icon: 'fa-crosshairs', meaning: 'Laser radiation. Avoid eye or skin exposure to direct or scattered radiation.', keywords: 'laser light beam' },
    { id: 'w14', category: 'warning', name: 'Low Temperature', icon: 'fa-snowflake', meaning: 'Risk of cold injury or frostbite. Wear appropriate thermal protection.', keywords: 'cold freeze frost' },
    { id: 'w15', category: 'warning', name: 'H2S Gas', icon: 'fa-wind', meaning: 'Hydrogen sulfide gas hazard. Extremely toxic. Use H2S monitor and follow emergency procedures.', keywords: 'hydrogen sulfide toxic gas' },
    // PROHIBITION SIGNS (Red circle with line)
    { id: 'p1', category: 'prohibition', name: 'No Smoking', icon: 'fa-smoking-ban', meaning: 'Smoking is strictly prohibited in this area. Violators may be subject to disciplinary action.', keywords: 'smoke cigarette tobacco' },
    { id: 'p2', category: 'prohibition', name: 'No Entry', icon: 'fa-ban', meaning: 'Unauthorized entry prohibited. Only authorized personnel permitted beyond this point.', keywords: 'stop access restricted' },
    { id: 'p3', category: 'prohibition', name: 'No Mobile Phones', icon: 'fa-mobile-alt', meaning: 'Mobile phones must be switched off. Electronic devices may interfere with equipment or create ignition risk.', keywords: 'phone cell device' },
    { id: 'p4', category: 'prohibition', name: 'No Photography', icon: 'fa-camera', meaning: 'Photography and video recording prohibited. Security and proprietary information protection.', keywords: 'camera photo video' },
    { id: 'p5', category: 'prohibition', name: 'No Open Flame', icon: 'fa-fire', meaning: 'Open flames prohibited. No matches, lighters, or hot work without permit.', keywords: 'flame fire match lighter' },
    { id: 'p6', category: 'prohibition', name: 'No Water', icon: 'fa-tint-slash', meaning: 'Do not use water in this area. Water may react with materials or cause electrical hazard.', keywords: 'water liquid extinguisher' },
    { id: 'p7', category: 'prohibition', name: 'No Running', icon: 'fa-running', meaning: 'Running prohibited. Walk at all times to prevent slips, trips, and collisions.', keywords: 'run walk slow' },
    { id: 'p8', category: 'prohibition', name: 'No Food/Drink', icon: 'fa-utensils', meaning: 'Eating and drinking prohibited in this area. Contamination risk or hygiene requirements.', keywords: 'food eat drink beverage' },
    { id: 'p9', category: 'prohibition', name: 'No Pedestrians', icon: 'fa-walking', meaning: 'Pedestrians not allowed. Use designated walkways and crossing points only.', keywords: 'walk pedestrian path' },
    { id: 'p10', category: 'prohibition', name: 'Do Not Touch', icon: 'fa-hand', meaning: 'Do not touch. Equipment may be hot, energized, or otherwise hazardous.', keywords: 'touch hand contact' },
    // MANDATORY SIGNS (Blue circle)
    { id: 'm1', category: 'mandatory', name: 'Hard Hat Required', icon: 'fa-hard-hat', meaning: 'Safety helmet must be worn at all times in this area to protect against falling objects.', keywords: 'helmet hat head protection' },
    { id: 'm2', category: 'mandatory', name: 'Safety Glasses', icon: 'fa-glasses', meaning: 'Eye protection must be worn. Protects against flying debris, chemical splashes, and UV radiation.', keywords: 'glasses eyes goggles vision' },
    { id: 'm3', category: 'mandatory', name: 'Hearing Protection', icon: 'fa-headphones', meaning: 'Ear protection required. Noise levels exceed 85dB. Use earplugs or earmuffs.', keywords: 'ears hearing noise deaf' },
    { id: 'm4', category: 'mandatory', name: 'Safety Boots', icon: 'fa-shoe-prints', meaning: 'Safety footwear with steel toe caps must be worn. Protects against crushing and puncture injuries.', keywords: 'boots shoes feet steel toe' },
    { id: 'm5', category: 'mandatory', name: 'Hi-Vis Vest', icon: 'fa-vest', meaning: 'High visibility clothing must be worn to ensure you are visible to vehicle operators.', keywords: 'vest visibility reflective' },
    { id: 'm6', category: 'mandatory', name: 'Safety Gloves', icon: 'fa-mitten', meaning: 'Protective gloves required. Select appropriate gloves for the task (chemical, cut, heat resistant).', keywords: 'gloves hands protection' },
    { id: 'm7', category: 'mandatory', name: 'Face Shield', icon: 'fa-head-side-mask', meaning: 'Face shield or visor must be worn to protect entire face from splashes or debris.', keywords: 'face shield visor mask' },
    { id: 'm8', category: 'mandatory', name: 'Respirator Required', icon: 'fa-mask', meaning: 'Respiratory protection required. Ensure proper fit and correct filter for hazards present.', keywords: 'respirator mask breathing filter' },
    { id: 'm9', category: 'mandatory', name: 'Safety Harness', icon: 'fa-person-arrow-up-from-line', meaning: 'Full body harness required when working at heights above 6 feet (1.8m). Tie off 100%.', keywords: 'harness fall protection height' },
    { id: 'm10', category: 'mandatory', name: 'Wash Hands', icon: 'fa-hands-bubbles', meaning: 'Hand washing required. Use soap and water for at least 20 seconds before leaving area.', keywords: 'wash hands hygiene clean' },
    { id: 'm11', category: 'mandatory', name: 'Disconnect Power', icon: 'fa-plug', meaning: 'Disconnect electrical power before servicing equipment. Follow lockout/tagout procedures.', keywords: 'power electric disconnect LOTO' },
    { id: 'm12', category: 'mandatory', name: 'Use Handrail', icon: 'fa-hand-holding', meaning: 'Use handrails on stairs and elevated platforms at all times.', keywords: 'handrail stairs grip' },
    // EMERGENCY SIGNS (Green)
    { id: 'e1', category: 'emergency', name: 'First Aid', icon: 'fa-kit-medical', meaning: 'First aid equipment located here. Contains bandages, antiseptic, and basic medical supplies.', keywords: 'first aid medical kit' },
    { id: 'e2', category: 'emergency', name: 'Emergency Exit', icon: 'fa-door-open', meaning: 'Emergency exit route. Keep clear at all times. Know your nearest exit.', keywords: 'exit escape door evacuation' },
    { id: 'e3', category: 'emergency', name: 'Assembly Point', icon: 'fa-users', meaning: 'Emergency assembly point. Report here during evacuations for headcount.', keywords: 'assembly muster point gather' },
    { id: 'e4', category: 'emergency', name: 'Eye Wash Station', icon: 'fa-eye', meaning: 'Emergency eye wash station. Flush eyes for minimum 15-20 minutes if exposed to chemicals.', keywords: 'eye wash flush chemical' },
    { id: 'e5', category: 'emergency', name: 'Safety Shower', icon: 'fa-shower', meaning: 'Emergency safety shower. Use for full body chemical decontamination.', keywords: 'shower wash decontamination' },
    { id: 'e6', category: 'emergency', name: 'Emergency Phone', icon: 'fa-phone-alt', meaning: 'Emergency telephone. Dial emergency number posted. Give location and nature of emergency.', keywords: 'phone call emergency 911' },
    { id: 'e7', category: 'emergency', name: 'AED Defibrillator', icon: 'fa-heartbeat', meaning: 'Automated External Defibrillator location. For cardiac emergencies. Follow voice prompts.', keywords: 'AED heart defibrillator cardiac' },
    { id: 'e8', category: 'emergency', name: 'Stretcher', icon: 'fa-bed', meaning: 'Emergency stretcher/spine board located here for transporting injured persons.', keywords: 'stretcher carry injured transport' },
    { id: 'e9', category: 'emergency', name: 'Emergency Stop', icon: 'fa-stop-circle', meaning: 'Emergency stop button. Press to immediately halt machinery in emergency.', keywords: 'stop button emergency halt' },
    { id: 'e10', category: 'emergency', name: 'Rescue Equipment', icon: 'fa-life-ring', meaning: 'Rescue equipment stored here. Includes retrieval systems and emergency supplies.', keywords: 'rescue equipment retrieval' },
    // FIRE SAFETY SIGNS (Red)
    { id: 'f1', category: 'fire', name: 'Fire Extinguisher', icon: 'fa-fire-extinguisher', meaning: 'Fire extinguisher located here. Check type suitable for fire class. Use P.A.S.S. technique.', keywords: 'extinguisher fire fight' },
    { id: 'f2', category: 'fire', name: 'Fire Alarm', icon: 'fa-bell', meaning: 'Manual fire alarm call point. Break glass and push button to activate alarm.', keywords: 'alarm bell fire call point' },
    { id: 'f3', category: 'fire', name: 'Fire Blanket', icon: 'fa-blanket', meaning: 'Fire blanket for smothering small fires, especially clothing fires or kitchen fires.', keywords: 'blanket smother fire' },
    { id: 'f4', category: 'fire', name: 'Fire Hose', icon: 'fa-faucet', meaning: 'Fire hose reel. For use by trained personnel only. Ensure water supply is on.', keywords: 'hose water fire reel' },
    { id: 'f5', category: 'fire', name: 'Fire Exit', icon: 'fa-sign-out-alt', meaning: 'Fire exit route. Follow illuminated signs to nearest safe exit during evacuation.', keywords: 'exit fire escape evacuation' },
    { id: 'f6', category: 'fire', name: 'Sprinkler Valve', icon: 'fa-water', meaning: 'Fire sprinkler control valve. Do not close except during maintenance by authorized personnel.', keywords: 'sprinkler valve water automatic' },
    { id: 'f7', category: 'fire', name: 'Fire Door', icon: 'fa-door-closed', meaning: 'Fire door - keep closed. Prevents spread of fire and smoke. Do not prop open.', keywords: 'door fire closed keep shut' },
    { id: 'f8', category: 'fire', name: 'Foam Extinguisher', icon: 'fa-fire-extinguisher', meaning: 'Foam fire extinguisher. Suitable for Class A and B fires. Do not use on electrical fires.', keywords: 'foam extinguisher class A B' },
    { id: 'f9', category: 'fire', name: 'CO2 Extinguisher', icon: 'fa-fire-extinguisher', meaning: 'CO2 fire extinguisher. Suitable for electrical and Class B fires. Leaves no residue.', keywords: 'CO2 carbon dioxide electrical' },
    { id: 'f10', category: 'fire', name: 'Dry Powder Extinguisher', icon: 'fa-fire-extinguisher', meaning: 'Dry powder ABC extinguisher. Multi-purpose for Class A, B, and C fires.', keywords: 'powder dry ABC multipurpose' }
  ];
  
  let currentSignsCategory = 'all';
  
  function initSafetySigns() {
    currentSignsCategory = 'all';
    renderSafetySigns();
  }
  
  function switchSignsCategory(category) {
    currentSignsCategory = category;
    document.querySelectorAll('.signs-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.signs-tab[data-category="${category}"]`)?.classList.add('active');
    renderSafetySigns();
  }
  window.switchSignsCategory = switchSignsCategory;
  
  function filterSafetySigns() {
    renderSafetySigns();
  }
  window.filterSafetySigns = filterSafetySigns;
  
  function renderSafetySigns() {
    const container = document.getElementById('safetySignsContainer');
    const searchInput = document.getElementById('signsSearchInput');
    if (!container) return;
    const search = (searchInput?.value || '').toLowerCase();
    let filtered = currentSignsCategory === 'all' ? SAFETY_SIGNS_DATA : SAFETY_SIGNS_DATA.filter(s => s.category === currentSignsCategory);
    if (search) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(search) || s.meaning.toLowerCase().includes(search) || (s.keywords && s.keywords.includes(search)));
    }
    const categoryClasses = { warning: 'warning-sign', prohibition: 'prohibition-sign', mandatory: 'mandatory-sign', emergency: 'emergency-sign', fire: 'fire-sign' };
    container.innerHTML = filtered.length ? filtered.map(s => `
      <div class="safety-sign-card" onclick="showSignDetail('${s.id}')">
        <div class="sign-image ${categoryClasses[s.category]}"><i class="fas ${s.icon}"></i></div>
        <div class="sign-name">${s.name}</div>
      </div>
    `).join('') : '<div class="no-data">No signs found matching your search</div>';
  }
  
  function showSignDetail(id) {
    const sign = SAFETY_SIGNS_DATA.find(s => s.id === id);
    if (!sign) return;
    const categoryColors = { warning: '#f59e0b', prohibition: '#ef4444', mandatory: '#3b82f6', emergency: '#22c55e', fire: '#dc2626' };
    const categoryNames = { warning: 'Warning Sign', prohibition: 'Prohibition Sign', mandatory: 'Mandatory Sign', emergency: 'Emergency Sign', fire: 'Fire Safety Sign' };
    const categoryClasses = { warning: 'warning-sign', prohibition: 'prohibition-sign', mandatory: 'mandatory-sign', emergency: 'emergency-sign', fire: 'fire-sign' };
    const modal = document.createElement('div');
    modal.className = 'sign-detail-modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="sign-detail-content">
        <button class="sign-detail-close" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button>
        <div class="sign-detail-image ${categoryClasses[sign.category]}"><i class="fas ${sign.icon}"></i></div>
        <div class="sign-detail-name">${sign.name}</div>
        <div class="sign-detail-category" style="background: ${categoryColors[sign.category]}20; color: ${categoryColors[sign.category]}">${categoryNames[sign.category]}</div>
        <div class="sign-detail-meaning"><strong>Meaning:</strong><br>${sign.meaning}</div>
        <button class="pro-btn primary" onclick="printSingleSign('${id}')" style="margin-top:1rem;width:100%;"><i class="fas fa-print"></i> Print This Sign</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  window.showSignDetail = showSignDetail;
  
  function printSingleSign(id) {
    const sign = SAFETY_SIGNS_DATA.find(s => s.id === id);
    if (!sign) return;
    const categoryNames = { warning: 'Warning Sign', prohibition: 'Prohibition Sign', mandatory: 'Mandatory Sign', emergency: 'Emergency Sign', fire: 'Fire Safety Sign' };
    const categoryColors = { warning: '#f59e0b', prohibition: '#ef4444', mandatory: '#3b82f6', emergency: '#22c55e', fire: '#dc2626' };
    const userName = currentUser?.name || 'Safety Officer';
    const userId = currentUser?.employee_id || 'N/A';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>${sign.name} - Safety Sign</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; text-align: center; }
        .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { height: 40px; }
        .header h2 { color: #1e3a5f; margin: 10px 0 5px; }
        .header p { color: #666; font-size: 12px; margin: 0; }
        .sign-display { margin: 30px auto; width: 150px; height: 150px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 5rem; border: 5px solid ${categoryColors[sign.category]}; background: ${categoryColors[sign.category]}15; color: ${categoryColors[sign.category]}; }
        h1 { color: #1e3a5f; margin: 20px 0 10px; }
        .category { display: inline-block; padding: 5px 15px; border-radius: 20px; background: ${categoryColors[sign.category]}; color: white; font-size: 14px; margin-bottom: 20px; }
        .meaning { max-width: 500px; margin: 0 auto; text-align: left; padding: 20px; background: #f8fafc; border-radius: 10px; line-height: 1.8; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>
      <div class="header">
        <img src="${window.location.origin}/img/CAT.jpeg" alt="Logo" style="height:40px; margin-bottom:8px;">
        <h2>Safety Observer</h2>
        <p>Saudi Safety Group - Aramco CAT Project</p>
      </div>
      <div class="sign-display"><i class="fas ${sign.icon}"></i></div>
      <h1>${sign.name}</h1>
      <div class="category">${categoryNames[sign.category]}</div>
      <div class="meaning"><strong>Meaning:</strong><br>${sign.meaning}</div>
      <div class="footer">
        <p>Printed by: ${userName} (ID: ${userId}) | Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        <p>Post this sign in visible location as required by safety regulations</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }
  window.printSingleSign = printSingleSign;
  
  function printAllSigns() {
    const userName = currentUser?.name || 'Safety Officer';
    const userId = currentUser?.employee_id || 'N/A';
    const categoryNames = { warning: 'Warning Signs', prohibition: 'Prohibition Signs', mandatory: 'Mandatory Signs', emergency: 'Emergency Signs', fire: 'Fire Safety Signs' };
    const categoryColors = { warning: '#f59e0b', prohibition: '#ef4444', mandatory: '#3b82f6', emergency: '#22c55e', fire: '#dc2626' };
    const printWindow = window.open('', '_blank');
    let content = '';
    ['warning', 'prohibition', 'mandatory', 'emergency', 'fire'].forEach(cat => {
      const signs = SAFETY_SIGNS_DATA.filter(s => s.category === cat);
      content += `<h2 style="color: ${categoryColors[cat]}; border-bottom: 2px solid ${categoryColors[cat]}; padding-bottom: 5px;">${categoryNames[cat]}</h2>`;
      content += '<table style="width:100%; border-collapse: collapse; margin-bottom: 20px;"><tr><th style="text-align:left; padding:8px; border:1px solid #ddd;">Sign</th><th style="text-align:left; padding:8px; border:1px solid #ddd;">Meaning</th></tr>';
      signs.forEach(s => {
        content += `<tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${s.name}</td><td style="padding:8px; border:1px solid #ddd;">${s.meaning}</td></tr>`;
      });
      content += '</table>';
    });
    printWindow.document.write(`
      <html><head><title>Safety Signs Reference Guide</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
        .header { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px; }
        .header h2 { color: #1e3a5f; margin: 5px 0; }
        .header p { color: #666; margin: 0; font-size: 10px; }
        h2 { font-size: 14px; margin: 15px 0 8px; }
        table { font-size: 10px; }
        th { background: #f1f5f9; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { padding: 10px; } }
      </style>
      </head><body>
      <div class="header">
        <img src="${window.location.origin}/img/CAT.jpeg" alt="Logo" style="height:35px; margin-bottom:5px;">
        <h2>Safety Signs Reference Guide</h2>
        <p>Safety Observer - Saudi Safety Group (Aramco CAT Project)</p>
      </div>
      ${content}
      <div class="footer">Printed by: ${userName} (ID: ${userId}) | Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }
  window.printAllSigns = printAllSigns;

  function initMeetingTimer() {
    meetingTimerSeconds = 300;
    meetingTimerRunning = false;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const display = $('#timerDisplay');
    const circle = $('#timerCircle');
    if (!display) return;
    
    const mins = Math.floor(meetingTimerSeconds / 60);
    const secs = meetingTimerSeconds % 60;
    display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    
    if (circle) {
      if (meetingTimerSeconds <= 60) {
        circle.style.borderColor = '#ef4444';
      } else if (meetingTimerSeconds <= 120) {
        circle.style.borderColor = '#f59e0b';
      } else {
        circle.style.borderColor = '#22c55e';
      }
    }
  }

  function startMeetingTimer() {
    if (meetingTimerRunning) return;
    meetingTimerRunning = true;
    
    const startBtn = $('#startTimerBtn');
    const pauseBtn = $('#pauseTimerBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-flex';
    
    meetingTimerInterval = setInterval(() => {
      if (meetingTimerSeconds > 0) {
        meetingTimerSeconds--;
        updateTimerDisplay();
      } else {
        clearInterval(meetingTimerInterval);
        meetingTimerRunning = false;
        showToast('Meeting time complete!', 'success');
      }
    }, 1000);
  }
  window.startMeetingTimer = startMeetingTimer;

  function pauseMeetingTimer() {
    if (!meetingTimerRunning) return;
    meetingTimerRunning = false;
    clearInterval(meetingTimerInterval);
    
    const startBtn = $('#startTimerBtn');
    const pauseBtn = $('#pauseTimerBtn');
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = 'none';
  }
  window.pauseMeetingTimer = pauseMeetingTimer;

  function resetMeetingTimer() {
    pauseMeetingTimer();
    meetingTimerSeconds = 300;
    updateTimerDisplay();
  }
  window.resetMeetingTimer = resetMeetingTimer;

  function setTimerPreset(minutes) {
    pauseMeetingTimer();
    meetingTimerSeconds = minutes * 60;
    updateTimerDisplay();
    
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
  }
  window.setTimerPreset = setTimerPreset;

  function getRandomTBTTopic() {
    const topic = TBT_TOPICS[Math.floor(Math.random() * TBT_TOPICS.length)];
    const titleEl = $('#randomTopicTitle');
    const pointsEl = $('#randomTopicPoints');
    
    if (titleEl) titleEl.textContent = topic.title;
    if (pointsEl) {
      pointsEl.innerHTML = '<ul>' + topic.points.map(p => '<li>' + p + '</li>').join('') + '</ul>';
    }
  }
  window.getRandomTBTTopic = getRandomTBTTopic;

  const HEAT_STRESS_DATA = {
    safe: {
      category: 'Safe',
      categoryNum: 0,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      icon: 'fa-thermometer-quarter',
      workRest: 'Normal operations',
      waterIntake: 'Regular hydration',
      symptoms: ['No heat stress symptoms expected'],
      actions: ['Maintain normal hydration', 'Be aware of changing conditions']
    },
    caution: {
      category: 'I - Caution',
      categoryNum: 1,
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      icon: 'fa-thermometer-quarter',
      workRest: 'Normal work schedule',
      waterIntake: '1 cup (250ml) every 20 minutes',
      symptoms: ['Fatigue possible with prolonged exposure', 'Increased thirst'],
      actions: ['Monitor workers for early signs of heat stress', 'Ensure water is readily available', 'Encourage regular breaks in shade']
    },
    extremeCaution: {
      category: 'II - Extreme Caution',
      categoryNum: 2,
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      icon: 'fa-thermometer-half',
      workRest: '50 min work : 10 min rest',
      waterIntake: '1 cup (250ml) every 20 minutes',
      symptoms: ['Heat cramps possible', 'Heat exhaustion possible', 'Heat stroke possible with prolonged exposure'],
      actions: ['Mandatory rest breaks every hour', 'Provide shaded rest areas', 'Monitor all workers closely', 'Have first aid ready']
    },
    danger: {
      category: 'III - Danger',
      categoryNum: 3,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      icon: 'fa-thermometer-three-quarters',
      workRest: '30 min work : 10 min rest',
      waterIntake: '1 cup (250ml) every 15 minutes',
      symptoms: ['Heat cramps likely', 'Heat exhaustion likely', 'Heat stroke likely'],
      actions: ['Limit strenuous outdoor work', 'Mandatory rest breaks every 30 minutes', 'Continuous worker monitoring', 'Emergency response on standby']
    },
    extremeDanger: {
      category: 'IV - Extreme Danger',
      categoryNum: 4,
      color: '#b91c1c',
      bgColor: 'rgba(185, 28, 28, 0.15)',
      icon: 'fa-thermometer-full',
      workRest: '20 min work : 10 min rest',
      waterIntake: '1 cup (250ml) every 10 minutes',
      symptoms: ['Heat stroke imminent', 'Life-threatening conditions'],
      actions: ['STOP non-essential outdoor work', 'Emergency protocols active', 'Only critical operations with extreme precautions', 'Medical personnel on site required']
    }
  };

  function calculateHeatIndex() {
    const temp = parseFloat($('#inputTemp')?.value);
    const humidity = parseFloat($('#inputHumidity')?.value);
    const resultEl = $('#heatIndexResult');
    const categoryBadge = $('#heatCategoryBadge');
    const categoryText = $('#heatCategoryText');
    const detailsSection = $('#heatDetails');
    const resultCard = $('#heatResultCard');
    
    if (isNaN(temp) || isNaN(humidity)) {
      resultEl.textContent = '--';
      categoryText.textContent = 'Enter values';
      categoryBadge.className = 'heat-category-badge';
      if (detailsSection) detailsSection.style.display = 'none';
      if (resultCard) resultCard.className = 'heat-result-card';
      return;
    }

    const tempF = (temp * 9/5) + 32;
    let heatIndexF = tempF;
    
    if (tempF >= 80) {
      heatIndexF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity 
                   - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF 
                   - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity 
                   + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
      
      if (humidity < 13 && tempF >= 80 && tempF <= 112) {
        heatIndexF -= ((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
      } else if (humidity > 85 && tempF >= 80 && tempF <= 87) {
        heatIndexF += ((humidity - 85) / 10) * ((87 - tempF) / 5);
      }
    }
    
    const heatIndexC = (heatIndexF - 32) * 5/9;
    
    let data;
    let categoryClass;
    if (heatIndexC < 25) {
      data = HEAT_STRESS_DATA.safe;
      categoryClass = 'category-safe';
    } else if (heatIndexC < 30) {
      data = HEAT_STRESS_DATA.caution;
      categoryClass = 'category-caution';
    } else if (heatIndexC < 38) {
      data = HEAT_STRESS_DATA.extremeCaution;
      categoryClass = 'category-extreme-caution';
    } else if (heatIndexC < 41) {
      data = HEAT_STRESS_DATA.danger;
      categoryClass = 'category-danger';
    } else {
      data = HEAT_STRESS_DATA.extremeDanger;
      categoryClass = 'category-extreme-danger';
    }

    resultEl.textContent = heatIndexC.toFixed(1) + '°C';
    resultEl.style.color = data.color;
    
    categoryText.textContent = data.category;
    categoryBadge.style.background = data.bgColor;
    categoryBadge.style.color = data.color;
    categoryBadge.style.borderColor = data.color;
    categoryBadge.querySelector('i').className = 'fas ' + data.icon;
    
    if (resultCard) {
      resultCard.className = 'heat-result-card ' + categoryClass;
      resultCard.style.borderLeftColor = data.color;
    }

    if (detailsSection) {
      detailsSection.style.display = 'block';
      
      const workRestEl = $('#heatWorkRest');
      const waterEl = $('#heatWaterIntake');
      const symptomsEl = $('#heatSymptomsList');
      const actionsEl = $('#heatActionsSection');
      
      if (workRestEl) workRestEl.textContent = data.workRest;
      if (waterEl) waterEl.textContent = data.waterIntake;
      
      if (symptomsEl) {
        symptomsEl.innerHTML = data.symptoms.map(s => 
          `<span class="symptom-tag"><i class="fas fa-exclamation-circle"></i> ${s}</span>`
        ).join('');
      }
      
      if (actionsEl) {
        const isEmergency = data.categoryNum >= 4;
        actionsEl.innerHTML = `
          <h4><i class="fas ${isEmergency ? 'fa-exclamation-triangle' : 'fa-clipboard-check'}"></i> Required Actions:</h4>
          <ul class="actions-list ${isEmergency ? 'emergency' : ''}">
            ${data.actions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        `;
      }
    }
  }
  window.calculateHeatIndex = calculateHeatIndex;

  const WIND_SAFETY_DATA = {
    safe: {
      status: 'SAFE',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      cardClass: 'wind-safe',
      restriction: 'Normal operations - all activities permitted',
      standardCrane: { allowed: true, text: 'Permitted', color: '#22c55e' },
      manbasket: { allowed: true, text: 'Permitted', color: '#22c55e' }
    },
    caution: {
      status: 'CAUTION',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      cardClass: 'wind-caution',
      restriction: 'Stop manbasket operations, monitor conditions closely, secure loose materials',
      standardCrane: { allowed: true, text: 'Permitted (monitor)', color: '#f59e0b' },
      manbasket: { allowed: false, text: 'SUSPENDED', color: '#ef4444' }
    },
    restricted: {
      status: 'RESTRICTED',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      cardClass: 'wind-restricted',
      restriction: 'Stop ALL crane operations, review work at height activities, secure equipment',
      standardCrane: { allowed: false, text: 'SUSPENDED', color: '#ef4444' },
      manbasket: { allowed: false, text: 'SUSPENDED', color: '#ef4444' }
    },
    danger: {
      status: 'STOP WORK',
      color: '#b91c1c',
      bgColor: 'rgba(185, 28, 28, 0.15)',
      cardClass: 'wind-danger',
      restriction: 'Suspend ALL outdoor work immediately, secure all equipment, seek shelter',
      standardCrane: { allowed: false, text: 'SUSPENDED', color: '#b91c1c' },
      manbasket: { allowed: false, text: 'SUSPENDED', color: '#b91c1c' }
    }
  };

  function calculateWindSafety() {
    const wind = parseFloat($('#inputWind')?.value);
    const resultEl = $('#windResult');
    const restrictionsEl = $('#windRestrictions');
    const resultCard = $('#windResultCard');
    const restrictionsSection = $('#windRestrictionsSection');
    const speedMphEl = $('#windSpeedMph');
    const standardCraneEl = $('#standardCraneStatus');
    const manbasketEl = $('#manbasketStatus');
    
    if (isNaN(wind)) {
      resultEl.textContent = '--';
      resultEl.style.color = '#6b7280';
      if (speedMphEl) speedMphEl.textContent = '-- mph';
      if (restrictionsSection) restrictionsSection.style.display = 'none';
      if (resultCard) resultCard.className = 'wind-result-card';
      return;
    }

    const windMph = (wind * 0.621371).toFixed(1);
    if (speedMphEl) speedMphEl.textContent = windMph + ' mph';

    let data;
    if (wind < 25) {
      data = WIND_SAFETY_DATA.safe;
    } else if (wind < 32) {
      data = WIND_SAFETY_DATA.caution;
    } else if (wind <= 40) {
      data = WIND_SAFETY_DATA.restricted;
    } else {
      data = WIND_SAFETY_DATA.danger;
    }

    resultEl.textContent = data.status;
    resultEl.style.color = data.color;
    
    if (resultCard) {
      resultCard.className = 'wind-result-card ' + data.cardClass;
      resultCard.style.borderLeftColor = data.color;
    }

    if (restrictionsSection) {
      restrictionsSection.style.display = 'block';
    }
    
    if (restrictionsEl) {
      restrictionsEl.innerHTML = `<i class="fas fa-info-circle"></i> ${data.restriction}`;
      restrictionsEl.style.background = data.bgColor;
      restrictionsEl.style.color = data.color;
    }

    if (standardCraneEl) {
      const craneStatusEl = standardCraneEl.querySelector('.crane-op-status');
      if (craneStatusEl) {
        craneStatusEl.textContent = data.standardCrane.text;
        craneStatusEl.style.color = data.standardCrane.color;
      }
      standardCraneEl.className = 'crane-op-item ' + (data.standardCrane.allowed ? 'allowed' : 'suspended');
    }

    if (manbasketEl) {
      const manbasketStatusEl = manbasketEl.querySelector('.crane-op-status');
      if (manbasketStatusEl) {
        manbasketStatusEl.textContent = data.manbasket.text;
        manbasketStatusEl.style.color = data.manbasket.color;
      }
      manbasketEl.className = 'crane-op-item ' + (data.manbasket.allowed ? 'allowed' : 'suspended');
    }
  }
  window.calculateWindSafety = calculateWindSafety;

  const ARAMCO_PPE_DATA = {
    general: {
      title: 'General Site Entry (Mandatory)',
      items: [
        { name: 'Hard Hat', icon: 'fa-hard-hat', desc: 'Saudi Aramco approved' },
        { name: 'Safety Eyewear', icon: 'fa-glasses', desc: 'With side shields' },
        { name: 'Safety Footwear', icon: 'fa-shoe-prints', desc: 'Steel toe, Saudi Aramco approved' }
      ]
    },
    chemical: {
      title: 'Chemical Handling',
      items: [
        { name: 'Chemical Gloves', icon: 'fa-hand-sparkles', desc: 'Per SDS requirements' },
        { name: 'Face Shield', icon: 'fa-head-side-mask', desc: 'For splash protection' },
        { name: 'Chemical Suit', icon: 'fa-vest', desc: 'Coveralls as required' },
        { name: 'Respirator', icon: 'fa-head-side-mask', desc: 'Per chemical hazard' }
      ]
    },
    noise: {
      title: 'High Noise Area (>85 dBA)',
      items: [
        { name: 'Hearing Protection', icon: 'fa-deaf', desc: 'Earplugs or earmuffs required' }
      ]
    },
    heights: {
      title: 'Work at Heights (>1.8m / 6ft)',
      items: [
        { name: 'Full Body Harness', icon: 'fa-user-shield', desc: 'With dorsal D-ring' },
        { name: 'Lanyard', icon: 'fa-link', desc: 'With shock absorber' },
        { name: 'Anchorage Point', icon: 'fa-anchor', desc: 'Rated for 5000 lbs min' }
      ]
    },
    confined: {
      title: 'Confined Space Entry',
      items: [
        { name: 'Respirator/SCBA', icon: 'fa-lungs', desc: 'Based on atmosphere test' },
        { name: 'Gas Detector', icon: 'fa-broadcast-tower', desc: '4-gas monitor required' },
        { name: 'Rescue Equipment', icon: 'fa-life-ring', desc: 'Lifelines and harnesses' },
        { name: 'Communication', icon: 'fa-walkie-talkie', desc: 'Two-way radio' }
      ]
    },
    welding: {
      title: 'Hot Work / Welding',
      items: [
        { name: 'Welding Helmet', icon: 'fa-mask', desc: 'Auto-darkening recommended' },
        { name: 'FR Clothing', icon: 'fa-fire-alt', desc: 'Flame resistant coveralls' },
        { name: 'Welding Gloves', icon: 'fa-mitten', desc: 'Heat resistant leather' },
        { name: 'Welding Apron', icon: 'fa-tshirt', desc: 'Leather protection' }
      ]
    },
    blasting: {
      title: 'Abrasive Blasting',
      items: [
        { name: 'Type CE Hood', icon: 'fa-head-side-mask', desc: 'NIOSH/MSHA approved, air-supplied' },
        { name: 'Coveralls', icon: 'fa-vest', desc: 'Full body protection' },
        { name: 'Leather Gloves', icon: 'fa-mitten', desc: 'Heavy duty' },
        { name: 'Hearing Protection', icon: 'fa-deaf', desc: 'Required (>85 dBA)' }
      ]
    },
    excavation: {
      title: 'Excavation Work',
      items: [
        { name: 'Reflective Vest', icon: 'fa-vest', desc: 'High visibility' },
        { name: 'Hard Hat', icon: 'fa-hard-hat', desc: 'With chin strap' },
        { name: 'Fall Protection', icon: 'fa-user-shield', desc: 'Near edges >1.8m' }
      ]
    }
  };

  function selectPPETask(taskType) {
    const data = ARAMCO_PPE_DATA[taskType];
    const container = $('#ppeResultsContainer');
    if (!data || !container) return;

    document.querySelectorAll('.ppe-task-card').forEach(c => c.classList.remove('selected'));
    const clickedCard = document.querySelector(`[data-task="${taskType}"]`);
    if (clickedCard) clickedCard.classList.add('selected');

    const generalItems = ARAMCO_PPE_DATA.general.items;
    const taskItems = taskType === 'general' ? [] : data.items;

    container.innerHTML = `
      <div class="ppe-results-section">
        <h4 class="ppe-section-title"><i class="fas fa-shield-alt"></i> Mandatory PPE (Always Required)</h4>
        <div class="ppe-items-grid">
          ${generalItems.map(item => `
            <div class="ppe-item-card mandatory">
              <div class="ppe-item-icon"><i class="fas ${item.icon}"></i></div>
              <div class="ppe-item-info">
                <span class="ppe-item-name">${item.name}</span>
                <span class="ppe-item-desc">${item.desc}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ${taskItems.length > 0 ? `
        <div class="ppe-results-section task-specific">
          <h4 class="ppe-section-title"><i class="fas fa-plus-circle"></i> ${data.title}</h4>
          <div class="ppe-items-grid">
            ${taskItems.map(item => `
              <div class="ppe-item-card task-ppe">
                <div class="ppe-item-icon"><i class="fas ${item.icon}"></i></div>
                <div class="ppe-item-info">
                  <span class="ppe-item-name">${item.name}</span>
                  <span class="ppe-item-desc">${item.desc}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="ppe-aramco-note">
        <i class="fas fa-info-circle"></i>
        <span>All PPE must be Saudi Aramco approved. Refer to Safety Data Sheets (SDS) for chemical-specific requirements.</span>
      </div>
    `;
    container.style.display = 'block';
  }
  window.selectPPETask = selectPPETask;

  let audioContext = null;
  let analyser = null;
  let microphone = null;
  let mediaStream = null;
  let animationId = null;
  let isListening = false;

  function initNoiseLevel() {
    const startBtn = $('#startNoiseBtn');
    const stopBtn = $('#stopNoiseBtn');
    if (startBtn) startBtn.style.display = 'inline-flex';
    if (stopBtn) stopBtn.style.display = 'none';
    updateNoiseDisplay(0, false);
  }

  async function startNoiseMeasurement() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(mediaStream);
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      isListening = true;
      $('#startNoiseBtn').style.display = 'none';
      $('#stopNoiseBtn').style.display = 'inline-flex';
      $('#noiseMeterContainer').classList.add('active');
      
      measureNoise();
    } catch (err) {
      console.error('Microphone access error:', err);
      showToast('Microphone access denied. Please allow microphone permission.', 'error');
    }
  }
  window.startNoiseMeasurement = startNoiseMeasurement;

  function measureNoise() {
    if (!isListening || !analyser) return;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    const minDb = 30;
    const maxDb = 130;
    const normalizedDb = minDb + (average / 255) * (maxDb - minDb);
    const db = Math.round(normalizedDb);
    
    updateNoiseDisplay(db, true);
    
    animationId = requestAnimationFrame(measureNoise);
  }

  function updateNoiseDisplay(db, isActive) {
    const dbValue = $('#noiseDbValue');
    const dbBar = $('#noiseDbBar');
    const statusText = $('#noiseStatusText');
    const statusDesc = $('#noiseStatusDesc');
    const meterContainer = $('#noiseMeterContainer');
    
    if (dbValue) dbValue.textContent = isActive ? db : '--';
    
    const percentage = Math.min(100, Math.max(0, ((db - 30) / 100) * 100));
    if (dbBar) dbBar.style.width = isActive ? percentage + '%' : '0%';
    
    let status, desc, colorClass;
    if (db < 70) {
      status = 'SAFE';
      desc = 'Normal conversation level. No hearing protection required.';
      colorClass = 'safe';
    } else if (db < 85) {
      status = 'MODERATE';
      desc = 'Extended exposure may cause fatigue. Consider limiting exposure time.';
      colorClass = 'moderate';
    } else if (db < 100) {
      status = 'DANGER - Aramco Threshold';
      desc = 'Hearing protection REQUIRED per Saudi Aramco standards (>85 dBA). Limit exposure to 8 hours max.';
      colorClass = 'danger';
    } else {
      status = 'EXTREME DANGER';
      desc = 'Immediate hearing damage risk! Double hearing protection recommended. Limit exposure to minutes.';
      colorClass = 'extreme';
    }
    
    if (statusText) {
      statusText.textContent = isActive ? status : 'Waiting...';
      statusText.className = 'noise-status-text ' + (isActive ? colorClass : '');
    }
    if (statusDesc) statusDesc.textContent = isActive ? desc : 'Press Start to begin noise measurement';
    
    if (dbBar) {
      dbBar.className = 'noise-db-bar ' + (isActive ? colorClass : '');
    }
    
    if (meterContainer) {
      meterContainer.className = 'noise-meter-container ' + (isActive ? 'active ' + colorClass : '');
    }
  }

  function stopNoiseMeasurement() {
    isListening = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (microphone) {
      microphone.disconnect();
      microphone = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    analyser = null;
    
    $('#startNoiseBtn').style.display = 'inline-flex';
    $('#stopNoiseBtn').style.display = 'none';
    updateNoiseDisplay(0, false);
  }
  window.stopNoiseMeasurement = stopNoiseMeasurement;

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
    await loadSettingsDropdown('#permitArea', 'permit_areas', '-- Select Area --');
    await loadSettingsDropdown('#permitType', 'permit_types', '-- Permit Type --');
  }

  async function loadEquipmentDropdowns() {
    await loadSettingsDropdown('#eqType', 'equipment_types', '-- Equipment Type --');
    await loadSettingsDropdown('#eqYardArea', 'yard_areas', '-- Yard/Area --');
  }

  async function loadTbtDropdowns() {
    await loadSettingsDropdown('#tbtTopic', 'tbt_topics', '-- Select Topic --');
    await loadSettingsDropdown('#tbtAreaSelect', 'tbt_areas', '-- Select Area --');
    await loadSettingsDropdown('#tbtFilterArea', 'tbt_areas', 'All Areas');
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

  function showAddPermitAreaInput() {
    $('#addPermitAreaInput').style.display = 'flex';
    $('#newPermitAreaName').focus();
  }
  window.showAddPermitAreaInput = showAddPermitAreaInput;

  function hideAddPermitAreaInput() {
    $('#addPermitAreaInput').style.display = 'none';
    $('#newPermitAreaName').value = '';
  }
  window.hideAddPermitAreaInput = hideAddPermitAreaInput;

  async function addNewPermitArea() {
    const name = $('#newPermitAreaName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/permit_areas', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#permitArea', 'permit_areas', '-- Select Area --');
      $('#permitArea').value = name;
      hideAddPermitAreaInput();
      showToast('Permit area added', 'success');
    } else {
      showToast('Failed to add permit area', 'error');
    }
  }
  window.addNewPermitArea = addNewPermitArea;

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

  function showAddTbtAreaInput() {
    $('#addTbtAreaInput').style.display = 'flex';
    $('#newTbtAreaName').focus();
  }
  window.showAddTbtAreaInput = showAddTbtAreaInput;

  function hideAddTbtAreaInput() {
    $('#addTbtAreaInput').style.display = 'none';
    $('#newTbtAreaName').value = '';
  }
  window.hideAddTbtAreaInput = hideAddTbtAreaInput;

  async function addNewTbtArea() {
    const name = $('#newTbtAreaName').value.trim();
    if (!name) return;
    const result = await apiCall('/settings/tbt_areas', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.id) {
      await loadSettingsDropdown('#tbtAreaSelect', 'tbt_areas', '-- Select Area --');
      await loadSettingsDropdown('#tbtFilterArea', 'tbt_areas', 'All Areas');
      $('#tbtAreaSelect').value = name;
      hideAddTbtAreaInput();
      showToast('TBT area added', 'success');
    } else {
      showToast('Failed to add TBT area', 'error');
    }
  }
  window.addNewTbtArea = addNewTbtArea;

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
      area: $('#tbtAreaSelect').value,
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
    const profileBtn = $('#profileButton');
    if (profileBtn) profileBtn.style.display = 'flex';
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
    const profileBtn = $('#profileButton');
    if (profileBtn) profileBtn.style.display = 'none';
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
    $('#settingsUserRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Safety Observer';
    $('#settingsPoints').textContent = points;
    $('#settingsLevel').textContent = level;
    
    if (currentUser.profile_pic) {
      $('#settingsProfilePic').src = currentUser.profile_pic;
    } else {
      $('#settingsProfilePic').src = 'img/default-avatar.svg';
    }
    
    // Update badge-style profile info
    const employeeId = currentUser.employee_id || '--';
    $('#settingsEmployeeId').textContent = employeeId;
    
    // Phone badge with clickable tel: link
    const phoneBadge = $('#settingsPhoneBadge');
    const phoneSpan = $('#settingsPhone');
    if (currentUser.phone) {
      phoneBadge.href = 'tel:' + currentUser.phone;
      phoneSpan.textContent = currentUser.phone;
      phoneBadge.classList.remove('not-set');
    } else {
      phoneBadge.href = '#';
      phoneSpan.textContent = 'Not set';
      phoneBadge.classList.add('not-set');
    }
    
    // Email badge with clickable mailto: link
    const emailBadge = $('#settingsEmailBadge');
    const emailSpan = $('#settingsEmail');
    if (currentUser.email) {
      emailBadge.href = 'mailto:' + currentUser.email;
      emailSpan.textContent = currentUser.email;
      emailBadge.classList.remove('not-set');
    } else {
      emailBadge.href = '#';
      emailSpan.textContent = 'Not set';
      emailBadge.classList.add('not-set');
    }
    
    // Bio row
    const bioSpan = $('#settingsBio');
    if (currentUser.bio) {
      bioSpan.textContent = currentUser.bio;
      bioSpan.style.fontStyle = 'italic';
    } else {
      bioSpan.textContent = 'No bio set';
      bioSpan.style.fontStyle = 'italic';
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
    // Hide news red dot when viewing news
    const newsDot = $('#newsDot');
    if (newsDot) newsDot.style.display = 'none';
    // Mark all news as read
    markAllNewsAsRead();
  });
  
  async function markAllNewsAsRead() {
    if (!authToken) return;
    try {
      const news = await apiCall('/news');
      if (news && Array.isArray(news)) {
        for (const item of news) {
          await fetch(`${API}/news/${item.id}/read`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + authToken }
          });
        }
      }
    } catch (err) {
      // Silent fail - not critical
    }
  }

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function loadPendingUsers() {
    openModal('adminPendingUsersModal');
    const container = $('#pendingUsersContent');
    container.innerHTML = '<p>Loading pending registrations...</p>';
    const users = await apiCall('/admin/users/pending');
    if (!users || !Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<div class="no-data">No pending registrations</div>';
      return;
    }
    let html = '<div class="admin-list">';
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
    const result = await apiCall(`/admin/users/${userId}/approve`, { method: 'PUT' });
    if (result?.success) {
      const el = document.getElementById(`pending-${userId}`);
      if (el) el.remove();
      const remaining = document.querySelectorAll('#pendingUsersContent .admin-user-item').length;
      if (remaining === 0) {
        $('#pendingUsersContent').innerHTML = '<div class="no-data">No pending registrations</div>';
      }
      updatePendingCount();
    }
  }
  window.approveUser = approveUser;

  async function rejectUser(userId) {
    if (!confirm('Are you sure you want to reject this registration? This will delete the user.')) return;
    const result = await apiCall(`/admin/users/${userId}/reject`, { method: 'PUT' });
    if (result?.success) {
      const el = document.getElementById(`pending-${userId}`);
      if (el) el.remove();
      const remaining = document.querySelectorAll('#pendingUsersContent .admin-user-item').length;
      if (remaining === 0) {
        $('#pendingUsersContent').innerHTML = '<div class="no-data">No pending registrations</div>';
      }
      updatePendingCount();
    }
  }
  window.rejectUser = rejectUser;

  async function updatePendingCount() {
    if (currentUser?.role !== 'admin') return;
    const users = await apiCall('/admin/users/pending');
    const count = Array.isArray(users) ? users.length : 0;
    const badge = $('#pendingCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  async function loadAdminUsers() {
    openModal('adminManageUsersModal');
    const container = $('#manageUsersContent');
    container.innerHTML = '<p>Loading users...</p>';
    const result = await apiCall('/admin/users');
    const users = Array.isArray(result) ? result : (result?.users || []);
    if (!users || users.length === 0) {
      container.innerHTML = '<div class="no-data">No users found</div>';
      return;
    }
    let html = '<div class="admin-list">';
    const positions = ['Safety Officer', 'Work Permit Receiver', 'Work Permit Issuer', 'Safety Supervisor', 'Safety Coordinator', 'Safety Manager'];
    users.forEach(u => {
      const approvedText = u.approved ? '<span class="badge badge-success">Approved</span>' : '<span class="badge badge-warning">Pending</span>';
      const isCurrentUser = currentUser && currentUser.id === u.id;
      const positionOptions = positions.map(p => `<option value="${p}" ${u.position === p ? 'selected' : ''}>${p}</option>`).join('');
      html += `<div class="admin-user-item" id="user-${u.id}">
        <div class="user-info">
          <strong>${u.name}</strong>
          <span class="user-id">${u.employee_id}</span>
          <span class="user-role badge badge-${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role}</span>
          ${approvedText}
          <span class="user-points">${u.points} pts</span>
        </div>
        <div style="margin:.5rem 0">
          <label style="font-size:.7rem;color:var(--text-soft);margin-right:.5rem">Position:</label>
          <select class="position-select" onchange="updateUserPosition(${u.id}, this.value)" style="max-width:200px">
            ${positionOptions}
          </select>
        </div>
        <div class="user-actions">
          <button class="btn btn-sm" onclick="adjustUserPoints(${u.id}, '${u.name}')"><i class="fas fa-star"></i> Points</button>
          ${u.role !== 'admin' ? `<button class="btn btn-sm" onclick="toggleUserRole(${u.id}, '${u.role}')"><i class="fas fa-user-shield"></i> Toggle Admin</button>` : ''}
          ${!isCurrentUser ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Remove</button>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }
  window.loadAdminUsers = loadAdminUsers;

  async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`)) return;
    if (!confirm(`Final confirmation: Delete ${userName}?`)) return;
    const result = await apiCall(`/users/${userId}`, { method: 'DELETE' });
    if (result?.success) {
      showToast(`User ${userName} has been removed`, 'success');
      loadAdminUsers();
    } else {
      showToast(result?.error || 'Failed to delete user', 'error');
    }
  }
  window.deleteUser = deleteUser;

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

  async function updateUserPosition(userId, position) {
    await apiCall(`/users/${userId}/position`, {
      method: 'PUT',
      body: JSON.stringify({ position })
    });
    showToast('Position updated', 'success');
  }
  window.updateUserPosition = updateUserPosition;

  let adminChallengeType = 'daily';
  
  async function loadAdminChallenges(type = null) {
    if (type) adminChallengeType = type;
    openModal('adminChallengesModal');
    const container = $('#challengesModalContent');
    container.innerHTML = `
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
    openModal('adminQuizModal');
    const container = $('#quizModalContent');
    container.innerHTML = `
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
    setupAreaBoxClear();
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
        { key: 'permit_types', label: 'Permit Types', endpoint: '/api/settings/permit_types', addEndpoint: '/api/settings/permit_types', deleteEndpoint: '/api/settings/permit_types' },
        { key: 'permit_areas', label: 'Permit Areas', endpoint: '/api/settings/permit_areas', addEndpoint: '/api/settings/permit_areas', deleteEndpoint: '/api/settings/permit_areas' }
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
        { key: 'tbt_topics', label: 'Topics', endpoint: '/api/settings/tbt_topics', addEndpoint: '/api/settings/tbt_topics', deleteEndpoint: '/api/settings/tbt_topics' },
        { key: 'tbt_areas', label: 'TBT Areas', endpoint: '/api/settings/tbt_areas', addEndpoint: '/api/settings/tbt_areas', deleteEndpoint: '/api/settings/tbt_areas' }
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
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
      const res = await fetch(tabConfig.endpoint, { headers });
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

  async function loadTrainingRolesDropdown() {
    try {
      const res = await fetch('/api/training-roles');
      const roles = await res.json();
      const select = $('#trainingRoleSelect');
      if (!select) return;
      select.innerHTML = '<option value="">-- Choose a Role --</option>';
      roles.forEach(role => {
        select.innerHTML += `<option value="${role.id}">${role.name}</option>`;
      });
    } catch (e) {
      console.error('Error loading training roles:', e);
    }
  }
  window.loadTrainingRolesDropdown = loadTrainingRolesDropdown;

  async function loadTrainingsForRole(event) {
    // Use the visible clone in fullViewContent if it exists, otherwise fall back to document
    const fullViewContent = document.getElementById('toolsFullViewContent');
    const scope = fullViewContent && fullViewContent.querySelector('#trainingRoleSelect') ? fullViewContent : document;
    
    const select = scope.querySelector('#trainingRoleSelect');
    const container = scope.querySelector('#trainingListContainer');
    const statsDiv = scope.querySelector('#trainingStats');
    
    if (!select || !select.value) {
      if (container) container.innerHTML = `
        <div class="training-empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>Select a role above to view training requirements</p>
        </div>
      `;
      if (statsDiv) statsDiv.style.display = 'none';
      return;
    }
    
    try {
      const res = await fetch(`/api/training-roles/${select.value}/trainings`);
      const trainings = await res.json();
      
      if (trainings.length === 0) {
        if (container) container.innerHTML = `
          <div class="training-empty-state">
            <i class="fas fa-info-circle"></i>
            <p>No trainings assigned to this role yet</p>
          </div>
        `;
        if (statsDiv) statsDiv.style.display = 'none';
        return;
      }
      
      let html = '<div class="training-list">';
      let count2yr = 0, count1yr = 0;
      
      trainings.forEach(t => {
        const validityClass = t.validity_years === 1 ? 'validity-1yr' : 'validity-2yr';
        const validityText = t.validity_years === 1 ? '1 Year' : '2 Years';
        if (t.validity_years === 1) count1yr++; else count2yr++;
        
        html += `
          <div class="training-item">
            <span class="training-item-name">${t.name}</span>
            <span class="training-item-validity ${validityClass}">
              <i class="fas fa-clock"></i> ${validityText}
            </span>
          </div>
        `;
      });
      html += '</div>';
      if (container) container.innerHTML = html;
      
      const countEl = scope.querySelector('#trainingCount');
      const count2yrEl = scope.querySelector('#training2YrCount');
      const count1yrEl = scope.querySelector('#training1YrCount');
      if (countEl) countEl.textContent = trainings.length;
      if (count2yrEl) count2yrEl.textContent = count2yr;
      if (count1yrEl) count1yrEl.textContent = count1yr;
      if (statsDiv) statsDiv.style.display = 'grid';
    } catch (e) {
      console.error('Error loading trainings for role:', e);
      if (container) container.innerHTML = '<p style="color:#ef4444;text-align:center;">Error loading trainings</p>';
    }
  }
  window.loadTrainingsForRole = loadTrainingsForRole;

  async function openTrainingMatrixSettings(type) {
    const adminContent = $('#adminContent');
    if (!adminContent) return;
    
    if (type === 'roles') {
      adminContent.innerHTML = `
        <div class="admin-section">
          <h3><i class="fas fa-user-tie"></i> Manage Training Roles</h3>
          <div class="training-admin-add-form">
            <input type="text" id="newRoleName" placeholder="New role name..."/>
            <button onclick="addTrainingRole()"><i class="fas fa-plus"></i> Add Role</button>
          </div>
          <div id="trainingRolesList" class="training-admin-list">Loading...</div>
        </div>
      `;
      await loadTrainingRolesList();
    } else if (type === 'trainings') {
      adminContent.innerHTML = `
        <div class="admin-section">
          <h3><i class="fas fa-certificate"></i> Manage Training Items</h3>
          <div class="training-admin-add-form">
            <input type="text" id="newTrainingName" placeholder="New training name..."/>
            <select id="newTrainingValidity">
              <option value="2">2 Years</option>
              <option value="1">1 Year</option>
            </select>
            <button onclick="addTrainingItem()"><i class="fas fa-plus"></i> Add Training</button>
          </div>
          <div id="trainingItemsList" class="training-admin-list">Loading...</div>
        </div>
      `;
      await loadTrainingItemsList();
    } else if (type === 'assignments') {
      const rolesRes = await fetch('/api/training-roles');
      const roles = await rolesRes.json();
      
      let rolesOptions = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
      
      adminContent.innerHTML = `
        <div class="admin-section">
          <h3><i class="fas fa-link"></i> Role-Training Assignments</h3>
          <div class="training-assignments-container">
            <div class="training-assignments-role-select">
              <select id="assignmentRoleSelect" onchange="loadRoleAssignments()">
                <option value="">-- Select a Role --</option>
                ${rolesOptions}
              </select>
            </div>
            <div id="assignmentsCheckboxes" class="training-assignments-checkboxes" style="display:none;"></div>
            <button id="saveAssignmentsBtn" class="training-assignments-save" style="display:none;" onclick="saveRoleAssignments()">
              <i class="fas fa-save"></i> Save Assignments
            </button>
          </div>
        </div>
      `;
    }
    adminContent.scrollIntoView({ behavior: 'smooth' });
  }
  window.openTrainingMatrixSettings = openTrainingMatrixSettings;

  async function loadTrainingRolesList() {
    try {
      const res = await fetch('/api/training-roles');
      const roles = await res.json();
      const container = $('#trainingRolesList');
      if (!container) return;
      
      if (roles.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No roles found</p>';
        return;
      }
      
      container.innerHTML = roles.map(role => `
        <div class="training-admin-item" data-id="${role.id}">
          <span class="training-admin-item-name">${role.name}</span>
          <div class="training-admin-actions">
            <button class="training-admin-btn assign-btn" onclick="openRoleAssignmentsInline(${role.id}, '${role.name.replace(/'/g, "\\'")}')"><i class="fas fa-link"></i> Assign</button>
            <button class="training-admin-btn edit-btn" onclick="editTrainingRole(${role.id}, '${role.name.replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i></button>
            <button class="training-admin-btn delete-btn" onclick="deleteTrainingRole(${role.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading roles:', e);
    }
  }

  async function loadTrainingItemsList() {
    try {
      const res = await fetch('/api/training-items');
      const items = await res.json();
      const container = $('#trainingItemsList');
      if (!container) return;
      
      if (items.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No trainings found</p>';
        return;
      }
      
      container.innerHTML = items.map(item => `
        <div class="training-admin-item" data-id="${item.id}">
          <span class="training-admin-item-name">${item.name}</span>
          <span class="training-admin-item-validity">${item.validity_years} Year${item.validity_years > 1 ? 's' : ''}</span>
          <div class="training-admin-actions">
            <button class="training-admin-btn edit-btn" onclick="editTrainingItem(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.validity_years})"><i class="fas fa-edit"></i></button>
            <button class="training-admin-btn delete-btn" onclick="deleteTrainingItem(${item.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading training items:', e);
    }
  }

  async function addTrainingRole() {
    const input = $('#newRoleName');
    if (!input || !input.value.trim()) {
      showToast('Please enter a role name', 'error');
      return;
    }
    try {
      const res = await fetch('/api/training-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ name: input.value.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add role');
      input.value = '';
      showToast('Role added successfully', 'success');
      await loadTrainingRolesList();
      loadTrainingRolesDropdown();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.addTrainingRole = addTrainingRole;

  async function editTrainingRole(id, currentName) {
    const newName = prompt('Edit role name:', currentName);
    if (!newName || newName.trim() === currentName) return;
    try {
      const res = await fetch(`/api/training-roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ name: newName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      showToast('Role updated successfully', 'success');
      await loadTrainingRolesList();
      loadTrainingRolesDropdown();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.editTrainingRole = editTrainingRole;

  async function deleteTrainingRole(id) {
    if (!confirm('Are you sure you want to delete this role? This will also remove all training assignments for this role.')) return;
    try {
      const res = await fetch(`/api/training-roles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!res.ok) throw new Error('Failed to delete role');
      showToast('Role deleted successfully', 'success');
      await loadTrainingRolesList();
      loadTrainingRolesDropdown();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.deleteTrainingRole = deleteTrainingRole;

  async function addTrainingItem() {
    const nameInput = $('#newTrainingName');
    const validitySelect = $('#newTrainingValidity');
    if (!nameInput || !nameInput.value.trim()) {
      showToast('Please enter a training name', 'error');
      return;
    }
    try {
      const res = await fetch('/api/training-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ name: nameInput.value.trim(), validity_years: parseInt(validitySelect.value) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add training');
      nameInput.value = '';
      showToast('Training added successfully', 'success');
      await loadTrainingItemsList();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.addTrainingItem = addTrainingItem;

  async function editTrainingItem(id, currentName, currentValidity) {
    const newName = prompt('Edit training name:', currentName);
    if (!newName) return;
    const newValidity = prompt('Validity period (1 or 2 years):', currentValidity);
    if (!newValidity || !['1', '2'].includes(newValidity)) {
      showToast('Validity must be 1 or 2', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/training-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ name: newName.trim(), validity_years: parseInt(newValidity) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update training');
      showToast('Training updated successfully', 'success');
      await loadTrainingItemsList();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.editTrainingItem = editTrainingItem;

  async function deleteTrainingItem(id) {
    if (!confirm('Are you sure you want to delete this training? This will also remove it from all role assignments.')) return;
    try {
      const res = await fetch(`/api/training-items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!res.ok) throw new Error('Failed to delete training');
      showToast('Training deleted successfully', 'success');
      await loadTrainingItemsList();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.deleteTrainingItem = deleteTrainingItem;

  async function loadRoleAssignments() {
    const roleSelect = $('#assignmentRoleSelect');
    const checkboxesDiv = $('#assignmentsCheckboxes');
    const saveBtn = $('#saveAssignmentsBtn');
    
    if (!roleSelect || !checkboxesDiv || !saveBtn) return;
    
    if (!roleSelect.value) {
      checkboxesDiv.style.display = 'none';
      saveBtn.style.display = 'none';
      return;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      checkboxesDiv.innerHTML = '<p style="text-align:center;color:#ef4444;padding:1rem;">Please log in as admin to manage assignments.</p>';
      checkboxesDiv.style.display = 'flex';
      saveBtn.style.display = 'none';
      return;
    }
    
    try {
      const res = await fetch(`/api/role-trainings/${roleSelect.value}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load assignments. Admin access required.');
      }
      
      const assignments = await res.json();
      
      if (!Array.isArray(assignments) || assignments.length === 0) {
        checkboxesDiv.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:1rem;">No training items available. Add trainings first.</p>';
        checkboxesDiv.style.display = 'flex';
        saveBtn.style.display = 'none';
        return;
      }
      
      checkboxesDiv.innerHTML = assignments.map(a => `
        <div class="training-assignment-item">
          <input type="checkbox" id="training_${a.id}" value="${a.id}" ${a.assigned ? 'checked' : ''}/>
          <label for="training_${a.id}">${a.name}</label>
          <span class="validity-tag">${a.validity_years}yr</span>
        </div>
      `).join('');
      
      checkboxesDiv.style.display = 'flex';
      saveBtn.style.display = 'inline-block';
    } catch (e) {
      console.error('Error loading assignments:', e);
      checkboxesDiv.innerHTML = `<p style="text-align:center;color:#ef4444;padding:1rem;">${e.message}</p>`;
      checkboxesDiv.style.display = 'flex';
      saveBtn.style.display = 'none';
    }
  }
  window.loadRoleAssignments = loadRoleAssignments;

  async function saveRoleAssignments() {
    const roleSelect = $('#assignmentRoleSelect');
    const checkboxes = document.querySelectorAll('#assignmentsCheckboxes input[type="checkbox"]:checked');
    
    if (!roleSelect || !roleSelect.value) return;
    
    const trainingIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    try {
      const res = await fetch(`/api/role-trainings/${roleSelect.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ training_ids: trainingIds })
      });
      if (!res.ok) throw new Error('Failed to save assignments');
      showToast('Assignments saved successfully', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.saveRoleAssignments = saveRoleAssignments;

  async function openRoleAssignmentsInline(roleId, roleName) {
    const container = $('#trainingRolesList');
    if (!container) return;
    
    const existingPanel = document.querySelector('.inline-assignments-panel');
    if (existingPanel) existingPanel.remove();
    
    const roleItem = container.querySelector(`[data-id="${roleId}"]`);
    if (!roleItem) return;
    
    try {
      const res = await fetch(`/api/role-trainings/${roleId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (!res.ok) {
        showToast('Failed to load training assignments. Please ensure you are logged in as admin.', 'error');
        return;
      }
      const assignments = await res.json();
      
      const panel = document.createElement('div');
      panel.className = 'inline-assignments-panel';
      panel.innerHTML = `
        <div class="inline-assignments-header">
          <h4><i class="fas fa-link"></i> Assign Trainings to: ${roleName}</h4>
          <button class="close-inline-panel" onclick="this.closest('.inline-assignments-panel').remove()"><i class="fas fa-times"></i></button>
        </div>
        <div class="inline-assignments-checkboxes">
          ${assignments.map(a => `
            <div class="training-assignment-item">
              <input type="checkbox" id="inline_training_${a.id}" value="${a.id}" ${a.assigned ? 'checked' : ''}/>
              <label for="inline_training_${a.id}">${a.name}</label>
              <span class="validity-tag">${a.validity_years}yr</span>
            </div>
          `).join('')}
        </div>
        <div class="inline-assignments-actions">
          <button class="training-assignments-save" onclick="saveInlineRoleAssignments(${roleId})">
            <i class="fas fa-save"></i> Save Assignments
          </button>
          <button class="inline-cancel-btn" onclick="this.closest('.inline-assignments-panel').remove()">Cancel</button>
        </div>
      `;
      
      roleItem.insertAdjacentElement('afterend', panel);
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      showToast('Error loading assignments: ' + e.message, 'error');
    }
  }
  window.openRoleAssignmentsInline = openRoleAssignmentsInline;

  async function saveInlineRoleAssignments(roleId) {
    const panel = document.querySelector('.inline-assignments-panel');
    if (!panel) return;
    
    const checkboxes = panel.querySelectorAll('input[type="checkbox"]:checked');
    const trainingIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    try {
      const res = await fetch(`/api/role-trainings/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ training_ids: trainingIds })
      });
      if (!res.ok) throw new Error('Failed to save assignments');
      showToast('Assignments saved successfully', 'success');
      panel.remove();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
  window.saveInlineRoleAssignments = saveInlineRoleAssignments;

  const originalToggleToolSection = window.toggleToolSection || function(){};
  window.toggleToolSection = function(section) {
    originalToggleToolSection(section);
    if (section === 'trainingMatrix') {
      loadTrainingRolesDropdown();
    }
  };

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

  // ========== SAFETY CALENDAR ==========
  const calendarState = {
    currentView: 'month',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    selectedDate: new Date(),
    events: [],
    filteredEvents: [],
    currentEventId: null,
    uploadedFiles: []
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  async function loadCalendarEvents() {
    const typeFilter = $('#calendarTypeFilter')?.value || '';
    const statusFilter = $('#calendarStatusFilter')?.value || '';
    const params = new URLSearchParams();
    if (typeFilter) params.append('type', typeFilter);
    if (statusFilter) params.append('status', statusFilter);
    params.append('month', calendarState.currentMonth + 1);
    params.append('year', calendarState.currentYear);
    
    try {
      const res = await fetch(`/api/calendar/events?${params}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        calendarState.events = await res.json();
        filterCalendarEvents();
      }
    } catch (e) {
      console.error('Error loading calendar events:', e);
    }
  }

  function filterCalendarEvents() {
    const search = ($('#calendarSearchInput')?.value || '').toLowerCase();
    calendarState.filteredEvents = calendarState.events.filter(e => {
      if (search && !e.title.toLowerCase().includes(search) && !(e.notes || '').toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });
    renderCalendar();
  }
  window.filterCalendarEvents = filterCalendarEvents;

  function renderCalendar() {
    const view = calendarState.currentView;
    $('#calendarMonthView').style.display = view === 'month' ? 'block' : 'none';
    $('#calendarWeekView').style.display = view === 'week' ? 'block' : 'none';
    $('#calendarDayView').style.display = view === 'day' ? 'block' : 'none';
    $('#calendarListView').style.display = view === 'list' ? 'block' : 'none';
    
    $('#calendarTitle').textContent = `${MONTH_NAMES[calendarState.currentMonth]} ${calendarState.currentYear}`;
    
    if (view === 'month') renderMonthView();
    else if (view === 'week') renderWeekView();
    else if (view === 'day') renderDayView();
    else if (view === 'list') renderListView();
  }

  function renderMonthView() {
    const grid = $('#calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const firstDay = new Date(calendarState.currentYear, calendarState.currentMonth, 1);
    const lastDay = new Date(calendarState.currentYear, calendarState.currentMonth + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();
    
    const prevMonth = new Date(calendarState.currentYear, calendarState.currentMonth, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const dayEl = createDayCell(prevMonth.getDate() - i, true);
      grid.appendChild(dayEl);
    }
    
    for (let day = 1; day <= totalDays; day++) {
      const isToday = today.getDate() === day && today.getMonth() === calendarState.currentMonth && today.getFullYear() === calendarState.currentYear;
      const dateStr = `${calendarState.currentYear}-${String(calendarState.currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayEvents = calendarState.filteredEvents.filter(e => e.date === dateStr);
      const dayEl = createDayCell(day, false, isToday, dayEvents, dateStr);
      grid.appendChild(dayEl);
    }
    
    const remainingCells = 42 - grid.children.length;
    for (let i = 1; i <= remainingCells; i++) {
      const dayEl = createDayCell(i, true);
      grid.appendChild(dayEl);
    }
  }

  function createDayCell(day, isOtherMonth, isToday = false, events = [], dateStr = '') {
    const div = document.createElement('div');
    div.className = 'calendar-day' + (isOtherMonth ? ' other-month' : '') + (isToday ? ' today' : '');
    div.innerHTML = `<div class="day-number">${day}</div><div class="day-events"></div>`;
    
    if (!isOtherMonth && dateStr) {
      div.onclick = () => openDayEvents(dateStr);
      const eventsDiv = div.querySelector('.day-events');
      events.slice(0, 3).forEach(event => {
        const dot = document.createElement('div');
        dot.className = `calendar-event-dot ${event.type.toLowerCase()}`;
        dot.title = event.title;
        eventsDiv.appendChild(dot);
        
        const item = document.createElement('div');
        item.className = `calendar-event-item event-type-${event.type.toLowerCase()}`;
        item.textContent = event.title;
        item.onclick = (e) => { e.stopPropagation(); openViewEventModal(event.id); };
        eventsDiv.appendChild(item);
      });
      if (events.length > 3) {
        const more = document.createElement('div');
        more.className = 'calendar-event-item';
        more.style.background = '#6b7280';
        more.textContent = `+${events.length - 3} more`;
        eventsDiv.appendChild(more);
      }
    }
    return div;
  }

  function openDayEvents(dateStr) {
    calendarState.selectedDate = new Date(dateStr + 'T00:00:00');
    calendarState.currentView = 'day';
    $all('.calendar-view-btn').forEach(b => b.classList.remove('active'));
    $('[data-view="day"]').classList.add('active');
    renderCalendar();
  }

  function renderWeekView() {
    const container = $('#weekViewContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const today = new Date();
    const startOfWeek = new Date(calendarState.selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.toDateString() === today.toDateString();
      const dayEvents = calendarState.filteredEvents.filter(e => e.date === dateStr);
      
      const col = document.createElement('div');
      col.className = 'week-day-column';
      col.innerHTML = `<div class="week-day-header ${isToday ? 'today' : ''}">${DAY_NAMES[i]}<br>${date.getDate()}</div>`;
      
      dayEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = `day-event-item ${event.type.toLowerCase()}`;
        item.innerHTML = `<div class="event-title">${event.title}</div><div class="event-meta">${event.type}</div>`;
        item.onclick = () => openViewEventModal(event.id);
        col.appendChild(item);
      });
      
      container.appendChild(col);
    }
  }

  function renderDayView() {
    const container = $('#dayViewContainer');
    if (!container) return;
    
    const dateStr = calendarState.selectedDate.toISOString().split('T')[0];
    const dayEvents = calendarState.filteredEvents.filter(e => e.date === dateStr);
    
    container.innerHTML = `<div class="day-view-header">${calendarState.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>`;
    
    if (dayEvents.length === 0) {
      container.innerHTML += '<p style="text-align:center;color:var(--text-soft);padding:2rem;">No events for this day</p>';
    } else {
      dayEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = `day-event-item ${event.type.toLowerCase()}`;
        item.innerHTML = `
          <div class="event-title">${event.title}</div>
          <div class="event-meta">${event.type} - ${event.status}</div>
          ${event.notes ? `<div class="event-meta">${event.notes}</div>` : ''}
        `;
        item.onclick = () => openViewEventModal(event.id);
        container.appendChild(item);
      });
    }
  }

  function renderListView() {
    const tbody = $('#calendarListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const sortedEvents = [...calendarState.filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedEvents.forEach(event => {
      const tr = document.createElement('tr');
      tr.onclick = () => openViewEventModal(event.id);
      tr.innerHTML = `
        <td>${new Date(event.date + 'T00:00:00').toLocaleDateString()}</td>
        <td>${event.title}</td>
        <td><span class="event-type-badge ${event.type.toLowerCase()}">${event.type}</span></td>
        <td><span class="status-pill status-${event.status.toLowerCase()}">${event.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
    
    if (sortedEvents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-soft);">No events found</td></tr>';
    }
  }

  function changeCalendarView(view) {
    calendarState.currentView = view;
    $all('.calendar-view-btn').forEach(b => b.classList.remove('active'));
    $(`[data-view="${view}"]`).classList.add('active');
    renderCalendar();
  }
  window.changeCalendarView = changeCalendarView;

  function navigateCalendar(direction) {
    if (calendarState.currentView === 'month') {
      calendarState.currentMonth += direction;
      if (calendarState.currentMonth > 11) {
        calendarState.currentMonth = 0;
        calendarState.currentYear++;
      } else if (calendarState.currentMonth < 0) {
        calendarState.currentMonth = 11;
        calendarState.currentYear--;
      }
    } else if (calendarState.currentView === 'week') {
      calendarState.selectedDate.setDate(calendarState.selectedDate.getDate() + (direction * 7));
      calendarState.currentMonth = calendarState.selectedDate.getMonth();
      calendarState.currentYear = calendarState.selectedDate.getFullYear();
    } else if (calendarState.currentView === 'day') {
      calendarState.selectedDate.setDate(calendarState.selectedDate.getDate() + direction);
      calendarState.currentMonth = calendarState.selectedDate.getMonth();
      calendarState.currentYear = calendarState.selectedDate.getFullYear();
    }
    loadCalendarEvents();
  }
  window.navigateCalendar = navigateCalendar;

  function navigateCalendarToToday() {
    const today = new Date();
    calendarState.currentMonth = today.getMonth();
    calendarState.currentYear = today.getFullYear();
    calendarState.selectedDate = today;
    loadCalendarEvents();
  }
  window.navigateCalendarToToday = navigateCalendarToToday;

  function openAddEventModal() {
    if (!currentUser) {
      showToast('Please login to add events', 'error');
      return;
    }
    calendarState.currentEventId = null;
    calendarState.uploadedFiles = [];
    $('#eventModalTitle').innerHTML = '<i class="fas fa-calendar-plus"></i> Add Event';
    $('#eventId').value = '';
    $('#eventTitle').value = '';
    $('#eventDate').value = calendarState.selectedDate.toISOString().split('T')[0];
    $('#eventType').value = '';
    $('#eventNotes').value = '';
    $('#eventAttachments').value = '';
    $('#eventAttachmentsList').innerHTML = '';
    $('#eventStatusDisplay').style.display = 'none';
    openModal('addEventModal');
  }
  window.openAddEventModal = openAddEventModal;

  async function openViewEventModal(eventId) {
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      if (!res.ok) throw new Error('Event not found');
      const event = await res.json();
      calendarState.currentEventId = eventId;
      
      $('#viewEventTitle').textContent = event.title;
      $('#viewEventTypeBadge').textContent = event.type;
      $('#viewEventTypeBadge').className = `event-type-badge ${event.type.toLowerCase()}`;
      $('#viewEventDate').textContent = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      $('#viewEventNotes').textContent = event.notes || 'No notes';
      $('#viewEventNotesRow').style.display = event.notes ? 'flex' : 'none';
      $('#viewEventStatus').textContent = event.status;
      $('#viewEventStatus').className = `status-pill status-${event.status.toLowerCase()}`;
      $('#viewEventCreatedBy').textContent = `Created by: ${event.created_by || 'Unknown'}`;
      
      const attachmentsSection = $('#viewEventAttachmentsSection');
      const attachmentsList = $('#viewEventAttachments');
      let attachments = [];
      try { attachments = JSON.parse(event.attachments || '[]'); } catch(e) {}
      
      if (attachments.length > 0) {
        attachmentsSection.style.display = 'block';
        attachmentsList.innerHTML = attachments.map(url => {
          const filename = url.split('/').pop();
          const icon = filename.match(/\.(pdf|doc|docx)$/i) ? 'fa-file-alt' : 'fa-image';
          return `<a href="${url}" target="_blank" class="attachment-link"><i class="fas ${icon}"></i> ${filename}</a>`;
        }).join('');
      } else {
        attachmentsSection.style.display = 'none';
      }
      
      const isOwner = currentUser && event.created_by_id === currentUser.id;
      const isAdmin = currentUser && currentUser.role === 'admin';
      
      $('#editEventBtn').style.display = (isOwner || isAdmin) ? 'flex' : 'none';
      $('#deleteEventBtn').style.display = isAdmin ? 'flex' : 'none';
      $('#approveEventBtn').style.display = (isAdmin && event.status === 'Pending') ? 'flex' : 'none';
      $('#completeEventBtn').style.display = ((isOwner || isAdmin) && event.status === 'Approved') ? 'flex' : 'none';
      
      openModal('viewEventModal');
    } catch (e) {
      showToast('Error loading event: ' + e.message, 'error');
    }
  }
  window.openViewEventModal = openViewEventModal;

  async function openEditEventModal() {
    closeModal('viewEventModal');
    const eventId = calendarState.currentEventId;
    
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      if (!res.ok) throw new Error('Event not found');
      const event = await res.json();
      
      $('#eventModalTitle').innerHTML = '<i class="fas fa-calendar-check"></i> Edit Event';
      $('#eventId').value = event.id;
      $('#eventTitle').value = event.title;
      $('#eventDate').value = event.date;
      $('#eventType').value = event.type;
      $('#eventNotes').value = event.notes || '';
      $('#eventAttachments').value = '';
      
      let attachments = [];
      try { attachments = JSON.parse(event.attachments || '[]'); } catch(e) {}
      calendarState.uploadedFiles = attachments;
      
      const list = $('#eventAttachmentsList');
      list.innerHTML = attachments.map((url, i) => {
        const filename = url.split('/').pop();
        return `<div class="attachment-preview-item"><i class="fas fa-file"></i> ${filename} <button type="button" onclick="removeCalendarAttachment(${i})">&times;</button></div>`;
      }).join('');
      
      $('#eventStatusDisplay').style.display = 'flex';
      $('#eventStatusText').textContent = event.status;
      $('#eventStatusText').className = `status-pill status-${event.status.toLowerCase()}`;
      
      openModal('addEventModal');
    } catch (e) {
      showToast('Error loading event: ' + e.message, 'error');
    }
  }
  window.openEditEventModal = openEditEventModal;

  function removeCalendarAttachment(index) {
    calendarState.uploadedFiles.splice(index, 1);
    const list = $('#eventAttachmentsList');
    list.innerHTML = calendarState.uploadedFiles.map((url, i) => {
      const filename = url.split('/').pop();
      return `<div class="attachment-preview-item"><i class="fas fa-file"></i> ${filename} <button type="button" onclick="removeCalendarAttachment(${i})">&times;</button></div>`;
    }).join('');
  }
  window.removeCalendarAttachment = removeCalendarAttachment;

  async function saveCalendarEvent(e) {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please login to save events', 'error');
      return;
    }
    
    const eventId = $('#eventId').value;
    const title = $('#eventTitle').value.trim();
    const date = $('#eventDate').value;
    const type = $('#eventType').value;
    const notes = $('#eventNotes').value.trim();
    const files = $('#eventAttachments').files;
    
    if (!title || !date || !type) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    let attachments = [...calendarState.uploadedFiles];
    
    if (files && files.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      try {
        const uploadRes = await fetch('/api/calendar/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          attachments = [...attachments, ...uploadData.urls];
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    
    const eventData = { title, date, type, notes, attachments: JSON.stringify(attachments) };
    
    try {
      const url = eventId ? `/api/calendar/events/${eventId}` : '/api/calendar/events';
      const method = eventId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(eventData)
      });
      
      if (res.ok) {
        showToast(eventId ? 'Event updated successfully' : 'Event created successfully', 'success');
        closeModal('addEventModal');
        loadCalendarEvents();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save event', 'error');
      }
    } catch (e) {
      showToast('Error saving event: ' + e.message, 'error');
    }
  }
  window.saveCalendarEvent = saveCalendarEvent;

  async function approveCalendarEvent() {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Only admins can approve events', 'error');
      return;
    }
    
    try {
      const res = await fetch(`/api/calendar/events/${calendarState.currentEventId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        showToast('Event approved', 'success');
        closeModal('viewEventModal');
        loadCalendarEvents();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to approve', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.approveCalendarEvent = approveCalendarEvent;

  async function completeCalendarEvent() {
    try {
      const res = await fetch(`/api/calendar/events/${calendarState.currentEventId}/complete`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        showToast('Event marked complete', 'success');
        closeModal('viewEventModal');
        loadCalendarEvents();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to complete', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.completeCalendarEvent = completeCalendarEvent;

  async function deleteCalendarEvent() {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Only admins can delete events', 'error');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const res = await fetch(`/api/calendar/events/${calendarState.currentEventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        showToast('Event deleted', 'success');
        closeModal('viewEventModal');
        loadCalendarEvents();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.deleteCalendarEvent = deleteCalendarEvent;

  // Calendar Settings Functions
  let calendarCategories = [];
  let calendarSettings = {};

  function openCalendarSettings() {
    const panel = document.getElementById('calendarSettingsPanel');
    if (panel) {
      panel.style.display = 'block';
      loadCalendarCategories();
      loadCalendarSettingsData();
    }
  }
  window.openCalendarSettings = openCalendarSettings;

  function closeCalendarSettings() {
    const panel = document.getElementById('calendarSettingsPanel');
    if (panel) panel.style.display = 'none';
    hideAddCategoryForm();
  }
  window.closeCalendarSettings = closeCalendarSettings;

  function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
    });
    const targetTab = document.getElementById(tab + 'Tab');
    if (targetTab) {
      targetTab.classList.add('active');
      targetTab.style.display = 'block';
    }
  }
  window.switchSettingsTab = switchSettingsTab;

  async function loadCalendarCategories() {
    try {
      const res = await fetch('/api/calendar/categories', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        calendarCategories = await res.json();
        renderCategoriesList();
        updateEventTypeDropdown();
      }
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  }

  function renderCategoriesList() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    
    if (calendarCategories.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-soft);padding:1rem;">No categories yet</p>';
      return;
    }
    
    list.innerHTML = calendarCategories.map(cat => `
      <div class="category-item" data-id="${cat.id}">
        <div class="category-color" style="background:${cat.color}"></div>
        <i class="fas ${cat.icon} category-icon"></i>
        <span class="category-name">${cat.name}</span>
        ${cat.is_active ? '' : '<span style="font-size:.7rem;color:var(--text-soft);">(inactive)</span>'}
        <div class="category-actions">
          <button onclick="toggleCategoryActive(${cat.id}, ${cat.is_active ? 0 : 1})" title="${cat.is_active ? 'Deactivate' : 'Activate'}">
            <i class="fas ${cat.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </button>
          <button class="delete-btn" onclick="deleteCategory(${cat.id})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  function updateEventTypeDropdown() {
    const select = document.getElementById('eventType');
    const filterSelect = document.getElementById('calendarTypeFilter');
    
    if (select) {
      const activeCategories = calendarCategories.filter(c => c.is_active);
      select.innerHTML = '<option value="">-- Select Type --</option>' + 
        activeCategories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
    }
    
    if (filterSelect) {
      const currentValue = filterSelect.value;
      filterSelect.innerHTML = '<option value="">All Types</option>' + 
        calendarCategories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
      filterSelect.value = currentValue;
    }
  }

  function showAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'block';
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryColor').value = '#3b82f6';
    document.getElementById('newCategoryIcon').value = 'fa-calendar';
  }
  window.showAddCategoryForm = showAddCategoryForm;

  function hideAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'none';
  }
  window.hideAddCategoryForm = hideAddCategoryForm;

  async function saveNewCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    const color = document.getElementById('newCategoryColor').value;
    const icon = document.getElementById('newCategoryIcon').value;
    
    if (!name) {
      showToast('Please enter a category name', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/calendar/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ name, color, icon })
      });
      
      if (res.ok) {
        showToast('Category added', 'success');
        hideAddCategoryForm();
        loadCalendarCategories();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add category', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.saveNewCategory = saveNewCategory;

  async function toggleCategoryActive(id, isActive) {
    try {
      const res = await fetch(`/api/calendar/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ is_active: isActive })
      });
      
      if (res.ok) {
        showToast(isActive ? 'Category activated' : 'Category deactivated', 'success');
        loadCalendarCategories();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update category', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.toggleCategoryActive = toggleCategoryActive;

  async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const res = await fetch(`/api/calendar/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        showToast('Category deleted', 'success');
        loadCalendarCategories();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete category', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.deleteCategory = deleteCategory;

  async function loadCalendarSettingsData() {
    try {
      const res = await fetch('/api/calendar/settings', {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      });
      if (res.ok) {
        calendarSettings = await res.json();
        populateSettingsForm();
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }

  function populateSettingsForm() {
    const requireApproval = document.getElementById('settingRequireApproval');
    const autoApproveAdmin = document.getElementById('settingAutoApproveAdmin');
    const notifyOnCreate = document.getElementById('settingNotifyOnCreate');
    const notifyOnApprove = document.getElementById('settingNotifyOnApprove');
    const defaultView = document.getElementById('settingDefaultView');
    const reminderDays = document.getElementById('settingReminderDays');
    
    if (requireApproval) requireApproval.checked = calendarSettings.require_approval === 'true' || calendarSettings.require_approval === true;
    if (autoApproveAdmin) autoApproveAdmin.checked = calendarSettings.auto_approve_admin === 'true' || calendarSettings.auto_approve_admin === true;
    if (notifyOnCreate) notifyOnCreate.checked = calendarSettings.notify_on_create === 'true' || calendarSettings.notify_on_create === true;
    if (notifyOnApprove) notifyOnApprove.checked = calendarSettings.notify_on_approve === 'true' || calendarSettings.notify_on_approve === true;
    if (defaultView) defaultView.value = calendarSettings.default_view || 'month';
    if (reminderDays) reminderDays.value = calendarSettings.reminder_days || '1';
  }

  async function saveCalendarSettings() {
    const settings = {
      require_approval: document.getElementById('settingRequireApproval').checked.toString(),
      auto_approve_admin: document.getElementById('settingAutoApproveAdmin').checked.toString(),
      notify_on_create: document.getElementById('settingNotifyOnCreate').checked.toString(),
      notify_on_approve: document.getElementById('settingNotifyOnApprove').checked.toString(),
      default_view: document.getElementById('settingDefaultView').value,
      reminder_days: document.getElementById('settingReminderDays').value
    };
    
    try {
      const res = await fetch('/api/calendar/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        showToast('Settings saved', 'success');
        calendarSettings = settings;
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save settings', 'error');
      }
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
  window.saveCalendarSettings = saveCalendarSettings;

  function showCalendarSettingsButton() {
    const btn = document.getElementById('calendarSettingsBtn');
    if (btn && currentUser && currentUser.role === 'admin') {
      btn.style.display = 'flex';
    } else if (btn) {
      btn.style.display = 'none';
    }
  }
  window.showCalendarSettingsButton = showCalendarSettingsButton;

  async function loadCalendarNotifications() {
    if (!currentUser || !authToken) return;
    
    try {
      const res = await fetch('/api/calendar/notifications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        const notifications = await res.json();
        const unreadCount = notifications.filter(n => !n.is_read).length;
        
        const badge = $('#notificationBadge');
        const wrapper = $('#notificationBellWrapper');
        
        if (wrapper) wrapper.style.display = 'block';
        
        if (badge) {
          badge.textContent = unreadCount;
          badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
        
        const list = $('#notificationsList');
        if (list) {
          if (notifications.length === 0) {
            list.innerHTML = '<p class="no-notifications">No notifications</p>';
          } else {
            list.innerHTML = notifications.slice(0, 10).map(n => `
              <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="handleNotificationClick(${n.id}, ${n.event_id})">
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${new Date(n.created_at).toLocaleString()}</div>
              </div>
            `).join('');
          }
        }
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    }
  }

  async function handleNotificationClick(notificationId, eventId) {
    await markNotificationRead(notificationId);
    if (eventId) {
      openToolFullView('safetyCalendar');
      setTimeout(() => openViewEventModal(eventId), 500);
    }
  }
  window.handleNotificationClick = handleNotificationClick;

  async function markNotificationRead(id) {
    try {
      await fetch(`/api/calendar/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      loadCalendarNotifications();
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  }
  window.markNotificationRead = markNotificationRead;

  async function markAllNotificationsRead() {
    try {
      await fetch('/api/calendar/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      loadCalendarNotifications();
      showToast('All notifications marked as read', 'success');
    } catch (e) {
      console.error('Error:', e);
    }
  }
  window.markAllNotificationsRead = markAllNotificationsRead;

  function toggleNotificationsDropdown() {
    const dropdown = $('#notificationsDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  }
  window.toggleNotificationsDropdown = toggleNotificationsDropdown;

  document.addEventListener('click', (e) => {
    const dropdown = $('#notificationsDropdown');
    const bell = $('#notificationBell');
    if (dropdown && dropdown.style.display === 'block' && !e.target.closest('.notification-bell-wrapper')) {
      dropdown.style.display = 'none';
    }
  });

  function openSafetyCalendar() {
    loadCalendarEvents();
    loadCalendarNotifications();
    loadCalendarCategories();
    showCalendarSettingsButton();
  }
  window.openSafetyCalendar = openSafetyCalendar;

  const origOpenToolFullView = window.openToolFullView;
  window.openToolFullView = function(tool) {
    if (typeof origOpenToolFullView === 'function') {
      origOpenToolFullView(tool);
    }
    if (tool === 'safetyCalendar') {
      openSafetyCalendar();
    }
  };

  setInterval(() => {
    if (currentUser) loadCalendarNotifications();
  }, 60000);

  const origInitForCalendar = init;
  init = async function() {
    await origInitForCalendar.call(this);
    if (currentUser) {
      loadCalendarNotifications();
    }
  };

  function exportCalendarCSV() {
    if (!calendarState.filteredEvents || calendarState.filteredEvents.length === 0) {
      showToast('No events to export', 'error');
      return;
    }
    
    const headers = ['Date', 'Title', 'Type', 'Status', 'Notes', 'Created By', 'Approved By'];
    let csv = headers.join(',') + '\n';
    
    const sortedEvents = [...calendarState.filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedEvents.forEach(event => {
      const row = [
        event.date,
        `"${(event.title || '').replace(/"/g, '""')}"`,
        event.type || '',
        event.status || '',
        `"${(event.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(event.created_by || '').replace(/"/g, '""')}"`,
        `"${(event.approved_by || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `safety_calendar_${MONTH_NAMES[calendarState.currentMonth]}_${calendarState.currentYear}.csv`;
    link.click();
    showToast('Calendar exported to CSV', 'success');
  }
  window.exportCalendarCSV = exportCalendarCSV;

  function printCalendarPDF() {
    if (!calendarState.filteredEvents || calendarState.filteredEvents.length === 0) {
      showToast('No events to print', 'error');
      return;
    }
    
    const sortedEvents = [...calendarState.filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    const monthYear = `${MONTH_NAMES[calendarState.currentMonth]} ${calendarState.currentYear}`;
    
    const typeColors = {
      'Meeting': '#3b82f6',
      'Walkthrough': '#22c55e',
      'Drill': '#f59e0b',
      'Campaign': '#8b5cf6',
      'Holiday': '#ef4444'
    };
    
    const statusColors = {
      'Pending': '#f59e0b',
      'Approved': '#22c55e',
      'Completed': '#3b82f6'
    };
    
    const typeCounts = {};
    let tableRows = '';
    
    sortedEvents.forEach(event => {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
      const typeColor = typeColors[event.type] || '#6b7280';
      const statusColor = statusColors[event.status] || '#6b7280';
      
      tableRows += `
        <tr>
          <td>${new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
          <td><strong>${event.title}</strong>${event.notes ? '<br><small style="color:#666;">' + event.notes.substring(0, 50) + (event.notes.length > 50 ? '...' : '') + '</small>' : ''}</td>
          <td><span class="type-badge" style="background:${typeColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:11px">${event.type}</span></td>
          <td><span class="status-badge" style="background:${statusColor};color:#fff;padding:3px 8px;border-radius:4px;font-size:11px">${event.status}</span></td>
          <td>${event.created_by || '-'}</td>
        </tr>
      `;
    });
    
    let summaryItems = `<div class="summary-item"><strong>${sortedEvents.length}</strong> Total Events</div>`;
    Object.entries(typeCounts).forEach(([type, count]) => {
      summaryItems += `<div class="summary-item"><strong>${count}</strong> ${type}s</div>`;
    });
    
    const content = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="summary" style="margin-top:20px;padding:15px;background:#f0f9ff;border-radius:8px">
        <h4 style="margin:0 0 10px 0;color:#0369a1">Summary</h4>
        <div class="summary-grid" style="display:flex;gap:15px;flex-wrap:wrap">
          ${summaryItems}
        </div>
      </div>
    `;
    
    printProfessionalPDF({
      title: `Safety Calendar Report - ${monthYear}`,
      content: content,
      showUserInfo: true,
      extraStyles: `.summary-item { padding:8px 15px; background:#fff; border-radius:6px; border:1px solid #e2e8f0; }`
    });
    
    showToast('Opening print dialog...', 'info');
  }
  window.printCalendarPDF = printCalendarPDF;

  // ===== EXCAVATION MODULE =====
  let currentExcavationId = null;

  async function loadExcavationDashboard() {
    try {
      const data = await apiCall('/excavations/stats');
      if (data) {
        $('#excTotalCount').textContent = data.active || 0;
        $('#excCompliantCount').textContent = data.compliant || 0;
        $('#excActionCount').textContent = data.needsAction || 0;
        $('#excStopWorkCount').textContent = data.stopWork || 0;
      }
      await loadExcavations();
      await populateExcavationDropdowns();
    } catch (e) {
      console.error('Error loading excavation dashboard:', e);
    }
  }
  window.loadExcavationDashboard = loadExcavationDashboard;

  async function loadExcavations() {
    const status = $('#excFilterStatus')?.value || '';
    const compliance = $('#excFilterCompliance')?.value || '';
    const search = $('#excSearchInput')?.value || '';
    
    let url = '/excavations?';
    if (status) url += `status=${encodeURIComponent(status)}&`;
    if (compliance) url += `compliance=${encodeURIComponent(compliance)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    
    const data = await apiCall(url);
    const container = $('#excavationsList');
    if (!container) return;
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty-state"><i class="fas fa-hard-hat"></i> No excavations found. Click "New Excavation" to add one.</p>';
      return;
    }
    
    container.innerHTML = data.map(exc => {
      const complianceClass = exc.compliance_status === 'Compliant' ? 'status-compliant' : 
                              exc.compliance_status === 'Needs Action' ? 'status-action' : 'status-stop';
      const statusClass = exc.status === 'active' ? 'status-active' : 
                          exc.status === 'completed' ? 'status-completed' : 'status-suspended';
      return `
        <div class="excavation-card" onclick="viewExcavation('${exc.id}')">
          <div class="excavation-card-header">
            <h4>${exc.name}</h4>
            <span class="excavation-status ${statusClass}">${exc.status}</span>
          </div>
          <div class="excavation-card-body">
            <p><i class="fas fa-map-marker-alt"></i> ${exc.area} - ${exc.location}</p>
            <p><i class="fas fa-ruler-vertical"></i> ${exc.depth}m × ${exc.width}m × ${exc.length}m</p>
            <p><i class="fas fa-shield-alt"></i> ${exc.protective_system || 'Not specified'}</p>
          </div>
          <div class="excavation-card-footer">
            <span class="compliance-badge ${complianceClass}">${exc.compliance_status}</span>
            <span class="excavation-date"><i class="fas fa-calendar"></i> ${new Date(exc.start_date).toLocaleDateString()}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  window.loadExcavations = loadExcavations;

  function showExcavationSection(section) {
    const sections = ['excavationDashboard', 'excavationPlanning', 'excavationInspections', 'excavationPermits', 'excavationTools'];
    sections.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = 'none';
    });
    
    const targetId = section === 'dashboard' ? 'excavationDashboard' :
                     section === 'planning' ? 'excavationPlanning' :
                     section === 'inspections' ? 'excavationInspections' :
                     section === 'permits' ? 'excavationPermits' : 'excavationTools';
    
    const target = document.getElementById(targetId);
    if (target) target.style.display = 'block';
    
    $all('.excavation-nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.excavation-nav-btn[onclick*="${section}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    if (section === 'dashboard') loadExcavationDashboard();
    if (section === 'planning') loadExcavationAreaDropdown();
  }
  window.showExcavationSection = showExcavationSection;

  async function loadExcavationAreaDropdown() {
    const areaSelect = $('#excArea');
    if (!areaSelect) return;
    
    const areas = await apiCall('/areas');
    if (areas && areas.length > 0) {
      areaSelect.innerHTML = '<option value="">-- Select Area --</option>' +
        areas.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }
  }

  async function populateExcavationDropdowns() {
    const data = await apiCall('/excavations?status=active');
    const options = '<option value="">-- Select Excavation --</option>' +
      (data || []).map(e => `<option value="${e.id}">${e.name} - ${e.area}</option>`).join('');
    
    const selectors = ['#inspExcavationSelect', '#permitExcavationSelect', '#inspExcavationId'];
    selectors.forEach(sel => {
      const el = $(sel);
      if (el) el.innerHTML = options;
    });
  }

  function updateExcavationRecommendations() {
    const depth = parseFloat($('#excDepth')?.value) || 0;
    const soilType = $('#excSoilType')?.value || '';
    const workerEntry = $('#excWorkerEntry')?.value || 'yes';
    const utilitiesMarked = $('#excUtilitiesMarked')?.value || '';
    
    const container = $('#excRecommendations');
    const listEl = $('#excRecommendationsList');
    if (!container || !listEl) return;
    
    const recommendations = [];
    
    // Depth-based recommendations (CSM II-1)
    if (depth > 0 && depth < 1.2 && workerEntry === 'no') {
      recommendations.push({ type: 'success', text: 'Protective system may not be required for depths < 1.2m without worker entry.' });
    } else if (depth >= 1.2) {
      recommendations.push({ type: 'warning', text: 'CSM II-1: Protective system REQUIRED for excavations ≥ 1.2m deep with worker entry.' });
    }
    
    if (depth >= 6) {
      recommendations.push({ type: 'danger', text: 'CSM II-1: Engineering design REQUIRED for excavations ≥ 6m deep.' });
    }
    
    // Soil-based recommendations
    if (soilType === 'A') {
      recommendations.push({ type: 'info', text: 'Type A soil: Max slope 3/4:1 (53°). Sloping or benching acceptable.' });
    } else if (soilType === 'B') {
      recommendations.push({ type: 'info', text: 'Type B soil: Max slope 1:1 (45°). Consider shoring for deeper excavations.' });
      if (depth >= 2.4) {
        recommendations.push({ type: 'warning', text: 'Engineering design recommended for Type B soil at this depth.' });
      }
    } else if (soilType === 'C') {
      recommendations.push({ type: 'warning', text: 'Type C soil: Max slope 1.5:1 (34°). Trench box or shoring strongly recommended.' });
      if (depth >= 2.4) {
        recommendations.push({ type: 'danger', text: 'Engineering design REQUIRED for Type C soil at depths ≥ 2.4m.' });
      }
    }
    
    // Utilities check
    if (utilitiesMarked === 'no') {
      recommendations.push({ type: 'danger', text: 'STOP: All utilities must be marked BEFORE excavation begins!' });
    }
    
    // Show/hide container
    if (recommendations.length > 0) {
      container.style.display = 'block';
      listEl.innerHTML = recommendations.map(r => 
        `<div class="csm-rec csm-rec-${r.type}"><i class="fas fa-${r.type === 'danger' ? 'exclamation-circle' : r.type === 'warning' ? 'exclamation-triangle' : r.type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${r.text}</div>`
      ).join('');
    } else {
      container.style.display = 'none';
    }
    
    // Show engineering doc field if needed
    const engDocGroup = $('#engineeringDocGroup');
    if (engDocGroup) {
      engDocGroup.style.display = (depth >= 6 || (depth >= 2.4 && (soilType === 'B' || soilType === 'C'))) ? 'block' : 'none';
    }
  }
  window.updateExcavationRecommendations = updateExcavationRecommendations;

  function getExcavationGPS() {
    const coordsInput = $('#excGpsCoords');
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'error');
      return;
    }
    showToast('Getting precise location...', 'info');
    navigator.geolocation.getCurrentPosition(
      pos => {
        coordsInput.value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        showToast(`Location captured (accuracy: ${pos.coords.accuracy.toFixed(0)}m)`, 'success');
      },
      err => showToast('Could not get location: ' + err.message, 'error'),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }
  window.getExcavationGPS = getExcavationGPS;

  async function submitExcavation(event) {
    event.preventDefault();
    
    const excId = $('#excId')?.value;
    const formData = {
      name: $('#excName')?.value,
      area: $('#excArea')?.value,
      location: $('#excLocation')?.value,
      gps_coords: $('#excGpsCoords')?.value,
      depth: parseFloat($('#excDepth')?.value) || 0,
      width: parseFloat($('#excWidth')?.value) || 0,
      length: parseFloat($('#excLength')?.value) || 0,
      soil_type: $('#excSoilType')?.value,
      worker_entry: $('#excWorkerEntry')?.value === 'yes',
      utilities_marked: $('#excUtilitiesMarked')?.value,
      gpr_performed: $('#excGprPerformed')?.value,
      dial_ref: $('#excDialRef')?.value,
      adjacent_structures: $('#excAdjacentStructures')?.value === 'yes',
      structure_distance: parseFloat($('#excStructureDistance')?.value) || null,
      protective_system: $('#excProtectiveSystem')?.value,
      start_date: $('#excStartDate')?.value,
      end_date: $('#excEndDate')?.value,
      supervisor: $('#excSupervisor')?.value,
      notes: $('#excNotes')?.value
    };
    
    try {
      const url = excId ? `/excavations/${excId}` : '/excavations';
      const method = excId ? 'PUT' : 'POST';
      
      const result = await apiCall(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      if (result && !result.error) {
        showToast(excId ? 'Excavation updated!' : 'Excavation created!', 'success');
        resetExcavationForm();
        showExcavationSection('dashboard');
      } else {
        showToast(result?.error || 'Failed to save excavation', 'error');
      }
    } catch (e) {
      console.error('Error saving excavation:', e);
      showToast('Error saving excavation', 'error');
    }
  }
  window.submitExcavation = submitExcavation;

  function resetExcavationForm() {
    const form = $('#excavationPlanningForm');
    if (form) form.reset();
    $('#excId').value = '';
    $('#excRecommendations').style.display = 'none';
    currentExcavationId = null;
    showExcavationSection('dashboard');
  }
  window.resetExcavationForm = resetExcavationForm;

  async function viewExcavation(id) {
    currentExcavationId = id;
    const data = await apiCall(`/excavations/${id}`);
    if (!data) {
      showToast('Could not load excavation', 'error');
      return;
    }
    
    const complianceClass = data.compliance_status === 'Compliant' ? 'status-compliant' : 
                            data.compliance_status === 'Needs Action' ? 'status-action' : 'status-stop';
    
    const content = `
      <h2><i class="fas fa-hard-hat"></i> ${data.name}</h2>
      <div class="view-excavation-status">
        <span class="excavation-status status-${data.status}">${data.status}</span>
        <span class="compliance-badge ${complianceClass}">${data.compliance_status}</span>
      </div>
      
      <div class="view-excavation-grid">
        <div class="view-section">
          <h4><i class="fas fa-map-marker-alt"></i> Location</h4>
          <p><strong>Area:</strong> ${data.area}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.gps_coords ? `<p><strong>GPS:</strong> <a href="https://maps.google.com/?q=${data.gps_coords}" target="_blank">${data.gps_coords}</a></p>` : ''}
        </div>
        
        <div class="view-section">
          <h4><i class="fas fa-ruler-vertical"></i> Specifications</h4>
          <p><strong>Depth:</strong> ${data.depth}m</p>
          <p><strong>Width:</strong> ${data.width}m</p>
          <p><strong>Length:</strong> ${data.length}m</p>
          <p><strong>Soil Type:</strong> ${data.soil_type}</p>
          <p><strong>Worker Entry:</strong> ${data.worker_entry ? 'Yes' : 'No'}</p>
        </div>
        
        <div class="view-section">
          <h4><i class="fas fa-shield-alt"></i> Protection</h4>
          <p><strong>Protective System:</strong> ${data.protective_system || 'Not specified'}</p>
          <p><strong>Utilities Marked:</strong> ${data.utilities_marked}</p>
          <p><strong>GPR Survey:</strong> ${data.gpr_performed}</p>
        </div>
        
        <div class="view-section">
          <h4><i class="fas fa-calendar-alt"></i> Schedule</h4>
          <p><strong>Start Date:</strong> ${new Date(data.start_date).toLocaleDateString()}</p>
          ${data.end_date ? `<p><strong>End Date:</strong> ${new Date(data.end_date).toLocaleDateString()}</p>` : ''}
          <p><strong>Supervisor:</strong> ${data.supervisor}</p>
        </div>
      </div>
      
      ${data.notes ? `<div class="view-section"><h4><i class="fas fa-sticky-note"></i> Notes</h4><p>${data.notes}</p></div>` : ''}
      
      <div class="view-section">
        <h4><i class="fas fa-clipboard-check"></i> Recent Inspections</h4>
        <div id="recentInspectionsView">Loading...</div>
      </div>
    `;
    
    $('#viewExcavationContent').innerHTML = content;
    
    // Show/hide action buttons based on status
    const completeBtn = $('#excCompleteBtn');
    const suspendBtn = $('#excSuspendBtn');
    if (completeBtn) completeBtn.style.display = data.status === 'active' ? 'inline-flex' : 'none';
    if (suspendBtn) {
      suspendBtn.style.display = data.status === 'active' ? 'inline-flex' : 'none';
      suspendBtn.innerHTML = data.status === 'suspended' ? '<i class="fas fa-play"></i> Resume' : '<i class="fas fa-pause"></i> Suspend';
    }
    
    openModal('viewExcavationModal');
    
    // Load recent inspections
    const inspections = await apiCall(`/excavations/${id}/inspections?limit=3`);
    const inspContainer = $('#recentInspectionsView');
    if (inspContainer) {
      if (inspections && inspections.length > 0) {
        inspContainer.innerHTML = inspections.map(insp => `
          <div class="mini-inspection-card status-${insp.overall_status}">
            <span>${new Date(insp.inspection_date).toLocaleDateString()} ${insp.inspection_time}</span>
            <span class="insp-status">${insp.overall_status}</span>
            <span>${insp.inspector}</span>
          </div>
        `).join('');
      } else {
        inspContainer.innerHTML = '<p class="empty-state-mini">No inspections recorded yet</p>';
      }
    }
  }
  window.viewExcavation = viewExcavation;

  async function editExcavation() {
    if (!currentExcavationId) return;
    
    const data = await apiCall(`/excavations/${currentExcavationId}`);
    if (!data) return;
    
    closeModal('viewExcavationModal');
    showExcavationSection('planning');
    await loadExcavationAreaDropdown();
    
    // Populate form
    $('#excId').value = data.id;
    $('#excName').value = data.name;
    $('#excArea').value = data.area;
    $('#excLocation').value = data.location;
    $('#excGpsCoords').value = data.gps_coords || '';
    $('#excDepth').value = data.depth;
    $('#excWidth').value = data.width;
    $('#excLength').value = data.length;
    $('#excSoilType').value = data.soil_type;
    $('#excWorkerEntry').value = data.worker_entry ? 'yes' : 'no';
    $('#excUtilitiesMarked').value = data.utilities_marked;
    $('#excGprPerformed').value = data.gpr_performed || 'no';
    $('#excDialRef').value = data.dial_ref || '';
    $('#excAdjacentStructures').value = data.adjacent_structures ? 'yes' : 'no';
    $('#excStructureDistance').value = data.structure_distance || '';
    $('#excProtectiveSystem').value = data.protective_system || '';
    $('#excStartDate').value = data.start_date?.split('T')[0] || '';
    $('#excEndDate').value = data.end_date?.split('T')[0] || '';
    $('#excSupervisor').value = data.supervisor;
    $('#excNotes').value = data.notes || '';
    
    updateExcavationRecommendations();
  }
  window.editExcavation = editExcavation;

  async function completeExcavation() {
    if (!currentExcavationId) return;
    if (!confirm('Mark this excavation as completed? This will archive it.')) return;
    
    const result = await apiCall(`/excavations/${currentExcavationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' })
    });
    
    if (result && !result.error) {
      showToast('Excavation marked as completed', 'success');
      closeModal('viewExcavationModal');
      loadExcavationDashboard();
    } else {
      showToast('Failed to update status', 'error');
    }
  }
  window.completeExcavation = completeExcavation;

  async function suspendExcavation() {
    if (!currentExcavationId) return;
    
    const data = await apiCall(`/excavations/${currentExcavationId}`);
    const newStatus = data?.status === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspend' : 'resume';
    
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this excavation?`)) return;
    
    const result = await apiCall(`/excavations/${currentExcavationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    
    if (result && !result.error) {
      showToast(`Excavation ${action}ed`, 'success');
      closeModal('viewExcavationModal');
      loadExcavationDashboard();
    } else {
      showToast('Failed to update status', 'error');
    }
  }
  window.suspendExcavation = suspendExcavation;

  async function openDailyInspectionModal() {
    await populateExcavationDropdowns();
    
    // Set default date/time
    const now = new Date();
    $('#inspDate').value = now.toISOString().split('T')[0];
    $('#inspTime').value = now.toTimeString().slice(0, 5);
    
    // Set inspector from current user
    if (currentUser) {
      $('#inspInspector').value = currentUser.name || currentUser.employee_name || '';
    }
    
    // Pre-select excavation if viewing one
    if (currentExcavationId) {
      $('#inspExcavationId').value = currentExcavationId;
    }
    
    openModal('dailyInspectionModal');
  }
  window.openDailyInspectionModal = openDailyInspectionModal;

  function openDailyInspectionForExcavation() {
    closeModal('viewExcavationModal');
    openDailyInspectionModal();
  }
  window.openDailyInspectionForExcavation = openDailyInspectionForExcavation;

  function toggleInspectionActions() {
    const status = $('#inspOverallStatus')?.value;
    const actionsGroup = $('#inspActionsGroup');
    if (actionsGroup) {
      actionsGroup.style.display = (status === 'conditional' || status === 'fail') ? 'block' : 'none';
    }
  }
  window.toggleInspectionActions = toggleInspectionActions;

  async function submitDailyInspection(event) {
    event.preventDefault();
    
    const formData = {
      excavation_id: $('#inspExcavationId')?.value,
      inspection_date: $('#inspDate')?.value,
      inspection_time: $('#inspTime')?.value,
      inspector: $('#inspInspector')?.value,
      soil_condition: $('#inspSoilCondition')?.value,
      shoring_condition: $('#inspShoringCondition')?.value,
      ladder_spacing: $('#inspLadderSpacing')?.value,
      spoil_distance: $('#inspSpoilDistance')?.value,
      water_accumulation: $('#inspWaterAccumulation')?.value,
      barricades: $('#inspBarricades')?.value,
      oxygen_level: parseFloat($('#inspOxygenLevel')?.value) || 0,
      lel_level: parseFloat($('#inspLelLevel')?.value) || 0,
      h2s_level: parseFloat($('#inspH2sLevel')?.value) || 0,
      co_level: parseFloat($('#inspCoLevel')?.value) || 0,
      overall_status: $('#inspOverallStatus')?.value,
      corrective_actions: $('#inspCorrectiveActions')?.value,
      notes: $('#inspNotes')?.value
    };
    
    const result = await apiCall('/excavations/inspections', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    if (result && !result.error) {
      showToast('Inspection submitted!', 'success');
      closeModal('dailyInspectionModal');
      $('#dailyInspectionForm').reset();
      loadExcavationDashboard();
    } else {
      showToast(result?.error || 'Failed to submit inspection', 'error');
    }
  }
  window.submitDailyInspection = submitDailyInspection;

  async function loadExcavationInspections() {
    const excId = $('#inspExcavationSelect')?.value;
    const container = $('#inspectionsList');
    if (!container) return;
    
    if (!excId) {
      container.innerHTML = '<p class="empty-state"><i class="fas fa-clipboard-check"></i> Select an excavation to view inspections</p>';
      return;
    }
    
    const data = await apiCall(`/excavations/${excId}/inspections`);
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty-state"><i class="fas fa-clipboard-check"></i> No inspections recorded for this excavation</p>';
      return;
    }
    
    container.innerHTML = data.map(insp => {
      const statusClass = insp.overall_status === 'pass' ? 'status-pass' : 
                          insp.overall_status === 'conditional' ? 'status-conditional' : 'status-fail';
      return `
        <div class="inspection-card ${statusClass}">
          <div class="inspection-card-header">
            <span class="inspection-date">${new Date(insp.inspection_date).toLocaleDateString()} ${insp.inspection_time}</span>
            <span class="inspection-status">${insp.overall_status.toUpperCase()}</span>
          </div>
          <div class="inspection-card-body">
            <p><strong>Inspector:</strong> ${insp.inspector}</p>
            <div class="inspection-readings">
              <span>O₂: ${insp.oxygen_level}%</span>
              <span>LEL: ${insp.lel_level}%</span>
              <span>H₂S: ${insp.h2s_level}ppm</span>
              <span>CO: ${insp.co_level}ppm</span>
            </div>
            ${insp.corrective_actions ? `<p class="corrective-actions"><strong>Actions:</strong> ${insp.corrective_actions}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  window.loadExcavationInspections = loadExcavationInspections;

  async function loadExcavationPermits() {
    const excId = $('#permitExcavationSelect')?.value;
    const container = $('#excavationPermitsList');
    if (!container) return;
    
    if (!excId) {
      container.innerHTML = '<p class="empty-state"><i class="fas fa-file-alt"></i> Select an excavation to view required permits</p>';
      return;
    }
    
    const data = await apiCall(`/excavations/${excId}/permits`);
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="empty-state"><i class="fas fa-file-alt"></i> No permits required for this excavation</p>';
      return;
    }
    
    container.innerHTML = data.map(permit => {
      const statusClass = permit.status === 'approved' ? 'permit-approved' : 
                          permit.status === 'pending' ? 'permit-pending' : 'permit-required';
      return `
        <div class="permit-card ${statusClass}">
          <div class="permit-icon"><i class="fas fa-file-alt"></i></div>
          <div class="permit-info">
            <h4>${permit.permit_type}</h4>
            <p>${permit.description || 'Required per CSM guidelines'}</p>
            <span class="permit-status">${permit.status || 'Required'}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  window.loadExcavationPermits = loadExcavationPermits;

  function openExcTool(tool) {
    let content = '';
    
    switch(tool) {
      case 'utilitiesChecker':
        content = `
          <h3><i class="fas fa-bolt"></i> Utilities Checker</h3>
          <div class="tool-content">
            <p>Before any excavation, verify:</p>
            <ul>
              <li>Contact local utility companies (Dial Before Dig)</li>
              <li>Obtain utility maps for the area</li>
              <li>Mark all underground utilities on site</li>
              <li>Maintain safe distances from utilities</li>
            </ul>
            <div class="csm-alert csm-alert-warning">
              <i class="fas fa-exclamation-triangle"></i>
              <span>CSM II-1: Hand digging required within 1m of marked utilities!</span>
            </div>
          </div>
        `;
        break;
      case 'protectiveSystem':
        content = `
          <h3><i class="fas fa-shield-alt"></i> Protective System Selector</h3>
          <div class="tool-content">
            <table class="csm-table">
              <thead>
                <tr><th>Soil Type</th><th>Max Slope</th><th>Recommended Protection</th></tr>
              </thead>
              <tbody>
                <tr><td>Type A</td><td>3/4:1 (53°)</td><td>Sloping or benching</td></tr>
                <tr><td>Type B</td><td>1:1 (45°)</td><td>Sloping, benching, or shoring</td></tr>
                <tr><td>Type C</td><td>1.5:1 (34°)</td><td>Trench box or shoring required</td></tr>
              </tbody>
            </table>
            <p class="csm-note">Engineering required for: Depths ≥6m (any soil), ≥2.4m in Type B/C</p>
          </div>
        `;
        break;
      case 'permitRequirements':
        content = `
          <h3><i class="fas fa-clipboard-list"></i> Permit Requirements</h3>
          <div class="tool-content">
            <p>Excavations may require:</p>
            <ul>
              <li><strong>General Work Permit</strong> - All excavations</li>
              <li><strong>Confined Space Permit</strong> - Depths >1.2m with worker entry</li>
              <li><strong>Hot Work Permit</strong> - If welding/cutting near excavation</li>
              <li><strong>Excavation-Specific Permit</strong> - Near utilities or structures</li>
            </ul>
          </div>
        `;
        break;
      case 'slopeCalculator':
        content = `
          <h3><i class="fas fa-drafting-compass"></i> Slope Calculator</h3>
          <div class="tool-content">
            <div class="slope-calc">
              <label>Soil Type:</label>
              <select id="slopeCalcSoil" onchange="calculateSlope()">
                <option value="">Select...</option>
                <option value="A">Type A</option>
                <option value="B">Type B</option>
                <option value="C">Type C</option>
              </select>
              <label>Excavation Depth (m):</label>
              <input type="number" id="slopeCalcDepth" step="0.1" onchange="calculateSlope()"/>
              <div id="slopeCalcResult"></div>
            </div>
          </div>
        `;
        break;
      case 'gasMonitor':
        content = `
          <h3><i class="fas fa-broadcast-tower"></i> Gas Monitoring Guide</h3>
          <div class="tool-content">
            <table class="csm-table">
              <thead>
                <tr><th>Gas</th><th>Safe Level</th><th>Action Level</th></tr>
              </thead>
              <tbody>
                <tr><td>Oxygen (O₂)</td><td>19.5% - 23.5%</td><td>&lt;19.5% or &gt;23.5%</td></tr>
                <tr><td>LEL</td><td>&lt;10%</td><td>≥10%</td></tr>
                <tr><td>H₂S</td><td>&lt;10 ppm</td><td>≥10 ppm</td></tr>
                <tr><td>CO</td><td>&lt;25 ppm</td><td>≥25 ppm</td></tr>
              </tbody>
            </table>
            <div class="csm-alert csm-alert-danger">
              <i class="fas fa-exclamation-circle"></i>
              <span>STOP WORK immediately if any readings exceed action levels!</span>
            </div>
          </div>
        `;
        break;
      case 'csmManual':
        window.open('https://drive.google.com/file/d/1imul0j3y9ONgLMSwWZ6aETE6xwvjK34L/view', '_blank');
        return;
    }
    
    showToolModal(content);
  }
  window.openExcTool = openExcTool;

  function showToolModal(content) {
    let modal = document.getElementById('excToolModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'excToolModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content exc-tool-modal-content">
          <button class="close-btn" onclick="closeExcTool()">×</button>
          <div id="excToolContent"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    document.getElementById('excToolContent').innerHTML = content;
    modal.classList.add('show');
  }

  function closeExcTool() {
    const modal = document.getElementById('excToolModal');
    if (modal) modal.classList.remove('show');
  }
  window.closeExcTool = closeExcTool;

  function calculateSlope() {
    const soil = $('#slopeCalcSoil')?.value;
    const depth = parseFloat($('#slopeCalcDepth')?.value) || 0;
    const resultEl = $('#slopeCalcResult');
    
    if (!soil || !depth || !resultEl) return;
    
    const slopes = { A: { ratio: '3/4:1', angle: 53, setback: depth * 0.75 }, B: { ratio: '1:1', angle: 45, setback: depth }, C: { ratio: '1.5:1', angle: 34, setback: depth * 1.5 } };
    const s = slopes[soil];
    
    resultEl.innerHTML = `
      <div class="slope-result">
        <p><strong>Maximum Slope:</strong> ${s.ratio} (${s.angle}°)</p>
        <p><strong>Required Setback:</strong> ${s.setback.toFixed(2)}m from edge</p>
        <p><strong>Total Width at Top:</strong> Excavation width + ${(s.setback * 2).toFixed(2)}m</p>
      </div>
    `;
  }
  window.calculateSlope = calculateSlope;

  const SAFETY_PLAYLIST_ID = 'PL0k4Uvrgzs7kZZeB8C0-7AANFTobUC8tp';
  const SAFETY_PLAYLIST_FIRST_VIDEO = 'zw36RHYQsNs';

  function openLearningVideos() {
    const container = document.getElementById('learningVideosContainer');
    const scroll = document.getElementById('learningVideosScroll');
    
    if (!container || !scroll) return;
    
    scroll.innerHTML = `
      <div class="video-slide playlist-embed">
        <iframe 
          src="https://www.youtube.com/embed/videoseries?list=${SAFETY_PLAYLIST_ID}&autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
        <div class="video-info">
          <h4>Safety Training Videos</h4>
          <p>Complete safety training playlist - swipe through videos using YouTube controls</p>
        </div>
      </div>
    `;
    
    container.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  window.openLearningVideos = openLearningVideos;

  function closeLearningVideos() {
    const container = document.getElementById('learningVideosContainer');
    const scroll = document.getElementById('learningVideosScroll');
    
    if (container) {
      container.classList.remove('active');
      document.body.style.overflow = '';
    }
    
    if (scroll) {
      scroll.innerHTML = '';
    }
  }
  window.closeLearningVideos = closeLearningVideos;

  // ========== DAILY REPORTS FUNCTIONALITY ==========
  const dailyReportState = { range: 'today', area: '' };
  const DEFAULT_EQUIPMENT_LIST = [
    'Rock Breaker', 'Loader', 'Fork lift', 'Skid Loader', 'Backhoe', 'Dump Truck',
    'Water Tanker', 'Wheel Loader', 'Over Head Crane', 'Bulldozer', 'Roller compactor',
    'Side boom', 'Generator', 'Welding machine', 'Air Compressor', 'HDD Machine',
    'Welding truck', 'Painting truck', 'Tractor', 'Bending Machine', 'Water Pump',
    'Filling Pump', 'Boom truck', 'Plate Compactor', 'Portable Generator', 'JCB',
    'Grader', 'Ambulance', 'Dozer', 'Drill Machine', 'Trailer', 'Crane'
  ];

  async function loadDailyReports() {
    const params = new URLSearchParams();
    if (dailyReportState.range !== 'all') params.append('range', dailyReportState.range);
    if (dailyReportState.area) params.append('area', dailyReportState.area);
    
    const reports = await apiCall(`/daily-reports?${params}`);
    const container = $('#dailyReportsList');
    if (!container) return;
    
    // Load areas for filter
    const areas = await apiCall('/daily-reports/areas');
    const areaSelect = $('#dailyReportFilterArea');
    if (areaSelect && Array.isArray(areas)) {
      areaSelect.innerHTML = '<option value="">All Areas</option>';
      areas.forEach(a => areaSelect.innerHTML += `<option value="${a}">${a}</option>`);
      areaSelect.value = dailyReportState.area;
    }
    
    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      container.innerHTML = '<div class="no-data-message"><i class="fas fa-clipboard-list"></i><p>No daily reports found for this period.</p></div>';
      return;
    }
    
    container.innerHTML = reports.map(r => `
      <div class="daily-report-card" onclick="viewDailyReport(${r.id})">
        <div class="report-card-header">
          <div class="report-date"><i class="fas fa-calendar"></i> ${r.date}</div>
          <div class="report-area-badge">${r.area}</div>
        </div>
        <div class="report-card-body">
          <div class="report-stat">
            <i class="fas fa-users"></i>
            <span class="stat-value">${r.total_manpower}</span>
            <span class="stat-label">Manpower</span>
          </div>
          <div class="report-stat">
            <span class="stat-detail">CAT: ${r.manpower_cat}</span>
            <span class="stat-detail">Rental: ${r.manpower_rental}</span>
          </div>
        </div>
        <div class="report-card-footer">
          <span class="updated-by">By: ${r.updated_by_name || r.created_by_name || '-'}</span>
          <span class="view-details"><i class="fas fa-chevron-right"></i></span>
        </div>
      </div>
    `).join('');
  }
  window.loadDailyReports = loadDailyReports;

  async function viewDailyReport(id) {
    const data = await apiCall(`/daily-reports/${id}`);
    if (!data) return;
    
    const { report, equipment } = data;
    const catEquip = equipment.filter(e => e.category === 'CAT' && e.quantity > 0);
    const rentalEquip = equipment.filter(e => e.category === 'RENTAL' && e.quantity > 0);
    
    let html = `
      <div class="dr-view-section">
        <div class="dr-view-row"><span class="dr-label">Date:</span><span class="dr-value">${report.date}</span></div>
        <div class="dr-view-row"><span class="dr-label">Location:</span><span class="dr-value">${report.area}${report.location ? ', ' + report.location : ''}</span></div>
      </div>
      <div class="dr-view-section">
        <div class="dr-section-title"><i class="fas fa-users"></i> Man Power Details</div>
        <div class="dr-stats-row">
          <div class="dr-stat-box"><span class="stat-num">${report.total_manpower}</span><span class="stat-txt">Total</span></div>
          <div class="dr-stat-box cat"><span class="stat-num">${report.manpower_cat}</span><span class="stat-txt">CAT</span></div>
          <div class="dr-stat-box rental"><span class="stat-num">${report.manpower_rental}</span><span class="stat-txt">Rental</span></div>
        </div>
      </div>`;
    
    if (catEquip.length > 0) {
      html += `<div class="dr-view-section"><div class="dr-section-title"><i class="fas fa-truck"></i> Equipment CAT</div><div class="dr-equip-list">`;
      catEquip.forEach(e => html += `<div class="dr-equip-item"><span class="eq-name">${e.equipment_name}</span><span class="eq-qty">${e.quantity}</span></div>`);
      html += `</div></div>`;
    }
    
    if (rentalEquip.length > 0) {
      html += `<div class="dr-view-section"><div class="dr-section-title"><i class="fas fa-dolly"></i> Equipment RENTAL</div><div class="dr-equip-list">`;
      rentalEquip.forEach(e => html += `<div class="dr-equip-item"><span class="eq-name">${e.equipment_name}</span><span class="eq-qty">${e.quantity}</span></div>`);
      html += `</div></div>`;
    }
    
    html += `<div class="dr-view-footer">Updated by: ${report.updated_by_name || report.created_by_name || '-'} on ${report.updated_at ? report.updated_at.split('T')[0] : '-'}</div>`;
    
    $('#viewDailyReportTitle').textContent = `Daily Report - ${report.date}`;
    $('#viewDailyReportContent').innerHTML = html;
    window.currentDailyReport = report;
    openModal('viewDailyReportModal');
  }
  window.viewDailyReport = viewDailyReport;

  function printDailyReport() {
    const content = $('#viewDailyReportContent').innerHTML;
    const title = $('#viewDailyReportTitle').textContent;
    printProfessionalPDF({
      title: title,
      content: content,
      showUserInfo: true
    });
  }
  window.printDailyReport = printDailyReport;

  async function initDailyReportForm() {
    // Load areas from API
    const areas = await apiCall('/daily-reports/areas');
    const areaSelect = $('#dailyReportArea');
    if (areaSelect && Array.isArray(areas)) {
      areaSelect.innerHTML = '<option value="">-- Select Area --</option>';
      areas.forEach(a => areaSelect.innerHTML += `<option value="${a}">${a}</option>`);
    }
    
    $('#dailyReportDate').value = new Date().toISOString().split('T')[0];
    
    // Load equipment from API
    let equipmentList = await apiCall('/daily-reports/equipment-list');
    
    // Ensure we have a valid array
    if (!Array.isArray(equipmentList) || equipmentList.length === 0) {
      equipmentList = DEFAULT_EQUIPMENT_LIST.map(name => ({ name, category: 'BOTH' }));
    }
    
    // Normalize - handle both string arrays and object arrays
    equipmentList = equipmentList.map(eq => {
      if (typeof eq === 'string') {
        return { name: eq, category: 'BOTH' };
      }
      return eq;
    });
    
    const catContainer = $('#equipmentCatContainer');
    const rentalContainer = $('#equipmentRentalContainer');
    
    // Filter equipment by category - default to BOTH if category is missing
    const catEquipment = equipmentList.filter(e => !e.category || e.category === 'BOTH' || e.category === 'CAT');
    const rentalEquipment = equipmentList.filter(e => !e.category || e.category === 'BOTH' || e.category === 'RENTAL');
    
    if (catContainer) {
      catContainer.innerHTML = catEquipment.map(eq => {
        const name = typeof eq === 'string' ? eq : eq.name;
        return `
          <div class="equipment-input-row">
            <label>${name}</label>
            <input type="number" name="cat_${name.replace(/\s+/g, '_')}" min="0" value="" placeholder="0" data-equip="${name}"/>
          </div>
        `;
      }).join('');
    }
    
    if (rentalContainer) {
      rentalContainer.innerHTML = rentalEquipment.map(eq => {
        const name = typeof eq === 'string' ? eq : eq.name;
        return `
          <div class="equipment-input-row">
            <label>${name}</label>
            <input type="number" name="rental_${name.replace(/\s+/g, '_')}" min="0" value="" placeholder="0" data-equip="${name}"/>
          </div>
        `;
      }).join('');
    }
  }

  async function checkDailyReportAutoFill() {
    const date = $('#dailyReportDate')?.value;
    const area = $('#dailyReportArea')?.value;
    const notice = $('#dailyReportAutoFillNotice');
    
    if (!date || !area) {
      if (notice) notice.style.display = 'none';
      return;
    }
    
    const data = await apiCall(`/daily-reports/by-date-area?date=${date}&area=${encodeURIComponent(area)}`);
    
    if (data && data.found) {
      if (notice) {
        notice.style.display = 'block';
        $('#autoFillText').textContent = `Previous data found for ${area} on ${date}. Form has been pre-filled.`;
        notice.className = 'autofill-notice success';
      }
      
      const r = data.report;
      if ($('#dailyReportLocation')) $('#dailyReportLocation').value = r.location || '';
      if ($('#dailyReportTotalManpower')) $('#dailyReportTotalManpower').value = r.total_manpower || 0;
      if ($('#dailyReportManpowerCat')) $('#dailyReportManpowerCat').value = r.manpower_cat || 0;
      if ($('#dailyReportManpowerRental')) $('#dailyReportManpowerRental').value = r.manpower_rental || 0;
      
      // Clear all equipment inputs first
      document.querySelectorAll('#equipmentCatContainer input').forEach(inp => inp.value = '');
      document.querySelectorAll('#equipmentRentalContainer input').forEach(inp => inp.value = '');
      
      // Fill in equipment values
      if (data.equipment) {
        data.equipment.forEach(e => {
          const container = e.category === 'CAT' ? '#equipmentCatContainer' : '#equipmentRentalContainer';
          const input = document.querySelector(`${container} input[data-equip="${e.equipment_name}"]`);
          if (input) input.value = e.quantity;
        });
      }
    } else {
      if (notice) {
        notice.style.display = 'block';
        $('#autoFillText').textContent = `No previous data for ${area} on ${date}. Starting fresh.`;
        notice.className = 'autofill-notice info';
      }
    }
  }
  window.checkDailyReportAutoFill = checkDailyReportAutoFill;

  $('#addDailyReportForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    
    const equipment_cat = {};
    document.querySelectorAll('#equipmentCatContainer input').forEach(inp => {
      const name = inp.dataset.equip;
      const val = parseInt(inp.value) || 0;
      if (val > 0) equipment_cat[name] = val;
    });
    
    const equipment_rental = {};
    document.querySelectorAll('#equipmentRentalContainer input').forEach(inp => {
      const name = inp.dataset.equip;
      const val = parseInt(inp.value) || 0;
      if (val > 0) equipment_rental[name] = val;
    });
    
    const payload = {
      date: $('#dailyReportDate').value,
      area: $('#dailyReportArea').value,
      location: $('#dailyReportLocation').value,
      total_manpower: parseInt($('#dailyReportTotalManpower').value) || 0,
      manpower_cat: parseInt($('#dailyReportManpowerCat').value) || 0,
      manpower_rental: parseInt($('#dailyReportManpowerRental').value) || 0,
      equipment_cat,
      equipment_rental
    };
    
    const result = await apiCall('/daily-reports', { method: 'POST', body: JSON.stringify(payload) });
    
    if (result && result.success) {
      showToast(result.isUpdate ? 'Daily report updated successfully' : 'Daily report created successfully', 'success');
      closeModal('addDailyReportModal');
      loadDailyReports();
    } else {
      showToast('Failed to save daily report', 'error');
    }
  });

  // Setup daily report filters
  document.addEventListener('click', e => {
    if (e.target.classList.contains('daily-report-chip')) {
      $all('.daily-report-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      dailyReportState.range = e.target.dataset.range;
      loadDailyReports();
    }
  });
  
  $('#dailyReportFilterArea')?.addEventListener('change', e => {
    dailyReportState.area = e.target.value;
    loadDailyReports();
  });

  // Open modal handler for daily report
  const originalOpenModal = window.openModal;
  window.openModal = async function(id) {
    if (typeof originalOpenModal === 'function') {
      await originalOpenModal(id);
    } else {
      const m = document.getElementById(id);
      if (m) m.classList.add('show');
    }
    
    if (id === 'addDailyReportModal') {
      await initDailyReportForm();
    }
  };

  // ========== PROFILE AREA SUMMARY ==========
  async function loadSettingsAreaDropdown() {
    const areas = await apiCall('/areas');
    const select = $('#settingsAssignedArea');
    if (!select || !areas) return;
    
    select.innerHTML = '<option value="">-- Select Your Area --</option>';
    areas.forEach(a => select.innerHTML += `<option value="${a}">${a}</option>`);
  }

  async function updateAssignedArea() {
    const area = $('#settingsAssignedArea')?.value;
    const result = await apiCall('/users/assigned-area', { method: 'PUT', body: JSON.stringify({ assigned_area: area }) });
    
    if (result) {
      if (currentUser) currentUser.assigned_area = area;
      if (area) {
        loadAreaSummary(area);
      } else {
        $('#areaSummaryDashboard').style.display = 'none';
      }
      showToast('Area updated successfully', 'success');
    }
  }
  window.updateAssignedArea = updateAssignedArea;

  function navigateToAreaPermits() {
    const area = currentUser?.assigned_area;
    if (!area) return;
    openTab(null, 'PermitsTab');
    setTimeout(() => {
      const areaFilter = $('#permitsFilterArea');
      if (areaFilter) {
        areaFilter.value = area;
        loadPermits();
      }
    }, 100);
  }
  window.navigateToAreaPermits = navigateToAreaPermits;

  function navigateToAreaObservations() {
    const area = currentUser?.assigned_area;
    if (!area) return;
    openTab(null, 'ObserveTab');
    setTimeout(() => {
      const areaFilter = $('#obsFilterArea');
      if (areaFilter) {
        areaFilter.value = area;
      }
      loadObservations();
    }, 100);
  }
  window.navigateToAreaObservations = navigateToAreaObservations;

  function navigateToAreaEquipment() {
    const area = currentUser?.assigned_area;
    if (!area) return;
    openTab(null, 'EquipmentTab');
    setTimeout(() => {
      const areaFilter = $('#eqFilterArea');
      if (areaFilter) {
        areaFilter.value = area;
        loadEquipment();
      }
    }, 100);
  }
  window.navigateToAreaEquipment = navigateToAreaEquipment;

  async function loadAreaSummary(area) {
    if (!area) {
      const dashboard = $('#areaSummaryDashboard');
      if (dashboard) dashboard.style.display = 'none';
      return;
    }
    
    const data = await apiCall(`/area-summary/${encodeURIComponent(area)}`);
    if (!data || data.error) {
      const dashboard = $('#areaSummaryDashboard');
      if (dashboard) dashboard.style.display = 'none';
      return;
    }
    
    const dashboard = $('#areaSummaryDashboard');
    if (dashboard) dashboard.style.display = 'block';
    
    const nameEl = $('#areaSummaryName');
    if (nameEl) nameEl.textContent = area;
    
    const permitsEl = $('#areaPermitsCount');
    if (permitsEl) permitsEl.textContent = data.permits?.active || 0;
    
    const obsEl = $('#areaObsCount');
    if (obsEl) obsEl.textContent = data.observations?.open || 0;
    const manpowerEl = $('#areaManpowerCount');
    if (manpowerEl) manpowerEl.textContent = data.manpower?.total || 0;
    
    const totalEquip = (data.equipment?.daily?.cat || 0) + (data.equipment?.daily?.rental || 0);
    const equipEl = $('#areaEquipmentCount');
    if (equipEl) equipEl.textContent = totalEquip;
    
    const eqDetails = $('#areaEquipmentDetails');
    if (totalEquip > 0 && eqDetails) {
      eqDetails.style.display = 'block';
      const catEl = $('#areaCatEquipment');
      if (catEl) catEl.textContent = data.equipment?.daily?.cat || 0;
      const rentalEl = $('#areaRentalEquipment');
      if (rentalEl) rentalEl.textContent = data.equipment?.daily?.rental || 0;
    } else if (eqDetails) {
      eqDetails.style.display = 'none';
    }
    
    const noReportEl = $('#noReportToday');
    if (noReportEl) {
      noReportEl.style.display = data.hasTodayReport ? 'none' : 'block';
    }
  }

  // Extend loadSettingsData to include area
  const originalLoadSettingsData = window.loadSettingsData;
  window.loadSettingsData = async function() {
    // Guard against null currentUser
    if (!window.currentUser && !localStorage.getItem('authToken')) return;
    
    if (typeof originalLoadSettingsData === 'function') {
      try {
        await originalLoadSettingsData();
      } catch (e) {
        console.warn('loadSettingsData error:', e);
      }
    }
    
    try {
      await loadSettingsAreaDropdown();
      
      // Get user profile with assigned area
      const profile = await apiCall('/users/profile');
      if (profile && profile.assigned_area) {
        const select = $('#settingsAssignedArea');
        if (select) select.value = profile.assigned_area;
        loadAreaSummary(profile.assigned_area);
      }
    } catch (e) {
      console.warn('loadSettingsAreaDropdown error:', e);
    }
  };

  // ========== PRINT FILTERED DAILY REPORTS ==========
  async function printFilteredDailyReports() {
    const params = new URLSearchParams();
    if (dailyReportState.range !== 'all') params.append('range', dailyReportState.range);
    if (dailyReportState.area) params.append('area', dailyReportState.area);
    
    const reports = await apiCall(`/daily-reports?${params}`);
    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      showToast('No reports to print', 'error');
      return;
    }
    
    const rangeLabels = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' };
    const rangeLabel = rangeLabels[dailyReportState.range] || 'All';
    const areaLabel = dailyReportState.area || 'All Areas';
    
    let tableRows = reports.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.area}</td>
        <td>${r.total_manpower}</td>
        <td>${r.manpower_cat}</td>
        <td>${r.manpower_rental}</td>
        <td>${r.updated_by_name || r.created_by_name || '-'}</td>
      </tr>
    `).join('');
    
    const totalManpower = reports.reduce((sum, r) => sum + (r.total_manpower || 0), 0);
    const totalCat = reports.reduce((sum, r) => sum + (r.manpower_cat || 0), 0);
    const totalRental = reports.reduce((sum, r) => sum + (r.manpower_rental || 0), 0);
    
    const content = `
      <div class="filters" style="background:#f3f4f6;padding:12px;border-radius:8px;margin-bottom:15px;display:flex;gap:20px">
        <div class="filter-item"><span style="color:#6b7280">Period:</span> <strong>${rangeLabel}</strong></div>
        <div class="filter-item"><span style="color:#6b7280">Area:</span> <strong>${areaLabel}</strong></div>
        <div class="filter-item"><span style="color:#6b7280">Total Reports:</span> <strong>${reports.length}</strong></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Area</th><th>Total Manpower</th><th>CAT</th><th>Rental</th><th>Reported By</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="totals">
        <div class="total-item"><div class="total-value">${totalManpower}</div><div class="total-label">Total Manpower</div></div>
        <div class="total-item"><div class="total-value">${totalCat}</div><div class="total-label">Total CAT</div></div>
        <div class="total-item"><div class="total-value">${totalRental}</div><div class="total-label">Total Rental</div></div>
      </div>
    `;
    
    printProfessionalPDF({
      title: `Daily Manpower & Equipment Reports - ${rangeLabel}`,
      content: content,
      showUserInfo: true
    });
  }
  window.printFilteredDailyReports = printFilteredDailyReports;

  // ========== ENHANCED LOCATION SHARING ==========
  function toggleLocationShare() {
    const content = $('#locationShareContent');
    const icon = $('#locToggleIcon');
    if (!content) return;
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-up');
    } else {
      content.style.display = 'none';
      icon.classList.remove('fa-chevron-up');
      icon.classList.add('fa-chevron-down');
    }
  }
  window.toggleLocationShare = toggleLocationShare;

  function getGPSLocationEnhanced() {
    const loading = $('#coordsLoading');
    const display = $('#coordsDisplay');
    
    if (loading) loading.style.display = 'block';
    if (display) display.style.display = 'none';
    
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      if (loading) loading.style.display = 'none';
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;
        
        if ($('#latValue')) $('#latValue').textContent = lat.toFixed(6);
        if ($('#lngValue')) $('#lngValue').textContent = lng.toFixed(6);
        if ($('#accValue')) $('#accValue').textContent = `${acc.toFixed(0)} meters`;
        
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        const mapsLink = $('#googleMapsLink');
        if (mapsLink) mapsLink.href = mapsUrl;
        
        window.currentCoords = { lat, lng, acc };
        
        if (loading) loading.style.display = 'none';
        if (display) display.style.display = 'block';
        
        showToast('Location retrieved successfully', 'success');
      },
      (error) => {
        if (loading) loading.style.display = 'none';
        let msg = 'Unable to retrieve location';
        if (error.code === 1) msg = 'Location permission denied';
        else if (error.code === 2) msg = 'Location unavailable';
        else if (error.code === 3) msg = 'Location request timed out';
        showToast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }
  window.getGPSLocationEnhanced = getGPSLocationEnhanced;

  function copyCoordinates() {
    if (!window.currentCoords) {
      showToast('No coordinates to copy', 'error');
      return;
    }
    
    const { lat, lng } = window.currentCoords;
    const text = `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}\nGoogle Maps: https://www.google.com/maps?q=${lat},${lng}`;
    
    navigator.clipboard.writeText(text).then(() => {
      showToast('Coordinates copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy coordinates', 'error');
    });
  }
  window.copyCoordinates = copyCoordinates;

  // ========== DAILY REPORT ADMIN SETTINGS ==========
  function openDailyReportSettings() {
    const section = $('#dailyReportSettingsSection');
    if (section) {
      section.style.display = 'block';
      loadEquipmentRegistry();
    }
  }
  window.openDailyReportSettings = openDailyReportSettings;

  function closeDailyReportSettings() {
    const section = $('#dailyReportSettingsSection');
    if (section) section.style.display = 'none';
  }
  window.closeDailyReportSettings = closeDailyReportSettings;

  function switchDRSettingsTab(tab) {
    $all('.dr-settings-tab').forEach(t => t.classList.remove('active'));
    $all('.dr-settings-content').forEach(c => c.style.display = 'none');
    
    document.querySelector(`.dr-settings-tab[data-tab="${tab}"]`)?.classList.add('active');
    
    if (tab === 'equipment') {
      $('#drEquipmentSettings').style.display = 'block';
      loadEquipmentRegistry();
    } else if (tab === 'areas') {
      $('#drAreasSettings').style.display = 'block';
      loadDRAreasRegistry();
    }
  }
  window.switchDRSettingsTab = switchDRSettingsTab;

  async function loadEquipmentRegistry() {
    const list = $('#equipmentRegistryList');
    if (!list) return;
    
    list.innerHTML = '<div class="no-items"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    const items = await apiCall('/admin/equipment-registry');
    if (!items || !Array.isArray(items) || items.length === 0) {
      list.innerHTML = '<div class="no-items">No equipment found. Add equipment above.</div>';
      return;
    }
    
    list.innerHTML = items.map(item => `
      <div class="dr-item-row" data-id="${item.id}">
        <div class="dr-item-info">
          <span class="dr-item-name">${item.name}</span>
          <span class="dr-item-cat cat-${(item.category || 'both').toLowerCase()}">${item.category || 'BOTH'}</span>
        </div>
        <div class="dr-item-actions">
          <button class="edit-btn" onclick="editEquipment(${item.id}, '${item.name.replace(/'/g, "\\'")}', '${item.category || 'BOTH'}')"><i class="fas fa-edit"></i></button>
          <button class="delete-btn" onclick="deleteEquipment(${item.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  async function addNewEquipment() {
    const name = $('#newEquipmentName')?.value?.trim();
    const category = $('#newEquipmentCategory')?.value;
    
    if (!name) {
      showToast('Please enter equipment name', 'error');
      return;
    }
    
    const result = await apiCall('/admin/equipment-registry', { method: 'POST', body: JSON.stringify({ name, category }) });
    if (result && !result.error) {
      showToast('Equipment added successfully', 'success');
      $('#newEquipmentName').value = '';
      loadEquipmentRegistry();
    } else {
      showToast(result?.error || 'Failed to add equipment', 'error');
    }
  }
  window.addNewEquipment = addNewEquipment;

  async function editEquipment(id, currentName, currentCategory) {
    const newName = prompt('Edit equipment name:', currentName);
    if (newName === null) return;
    
    const newCategory = prompt('Category (BOTH, CAT, RENTAL):', currentCategory);
    if (newCategory === null) return;
    
    const result = await apiCall(`/admin/equipment-registry/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName, category: newCategory }) });
    if (result && !result.error) {
      showToast('Equipment updated', 'success');
      loadEquipmentRegistry();
    } else {
      showToast(result?.error || 'Failed to update', 'error');
    }
  }
  window.editEquipment = editEquipment;

  async function deleteEquipment(id) {
    if (!confirm('Delete this equipment?')) return;
    
    const result = await apiCall(`/admin/equipment-registry/${id}`, { method: 'DELETE' });
    if (result && result.success) {
      showToast('Equipment deleted', 'success');
      loadEquipmentRegistry();
    } else {
      showToast('Failed to delete', 'error');
    }
  }
  window.deleteEquipment = deleteEquipment;

  async function loadDRAreasRegistry() {
    const list = $('#drAreasList');
    if (!list) return;
    
    list.innerHTML = '<div class="no-items"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    // Use the same endpoint that populates the daily report dropdown
    const items = await apiCall('/admin/daily-report-areas');
    if (!items || !Array.isArray(items) || items.length === 0) {
      list.innerHTML = '<div class="no-items">No areas found. Add areas above.</div>';
      return;
    }
    
    list.innerHTML = items.map(item => `
      <div class="dr-item-row" data-id="${item.id}">
        <div class="dr-item-info">
          <span class="dr-item-name">${item.name}</span>
        </div>
        <div class="dr-item-actions">
          <button class="edit-btn" onclick="editDRArea(${item.id}, '${item.name.replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i></button>
          <button class="delete-btn" onclick="deleteDRArea(${item.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  async function addNewDRArea() {
    const name = $('#newDRAreaName')?.value?.trim();
    
    if (!name) {
      showToast('Please enter area name', 'error');
      return;
    }
    
    const result = await apiCall('/admin/daily-report-areas', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && !result.error) {
      showToast('Area added successfully', 'success');
      $('#newDRAreaName').value = '';
      loadDRAreasRegistry();
    } else {
      showToast(result?.error || 'Failed to add area', 'error');
    }
  }
  window.addNewDRArea = addNewDRArea;

  async function editDRArea(id, currentName) {
    const newName = prompt('Edit area name:', currentName);
    if (newName === null) return;
    
    const result = await apiCall(`/admin/daily-report-areas/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
    if (result && !result.error) {
      showToast('Area updated', 'success');
      loadDRAreasRegistry();
    } else {
      showToast(result?.error || 'Failed to update', 'error');
    }
  }
  window.editDRArea = editDRArea;

  async function deleteDRArea(id) {
    if (!confirm('Delete this area?')) return;
    
    const result = await apiCall(`/admin/daily-report-areas/${id}`, { method: 'DELETE' });
    if (result && result.success) {
      showToast('Area deleted', 'success');
      loadDRAreasRegistry();
    } else {
      showToast('Failed to delete', 'error');
    }
  }
  window.deleteDRArea = deleteDRArea;

  // Extend openAdminRegistry to handle daily-reports
  const originalOpenAdminRegistry = window.openAdminRegistry;
  window.openAdminRegistry = async function(type) {
    if (type === 'daily-reports') {
      const reports = await apiCall('/admin/daily-reports');
      if (!reports || !Array.isArray(reports)) {
        showToast('No daily reports found', 'info');
        return;
      }
      
      let html = `
        <div class="registry-modal-header">
          <h2><i class="fas fa-clipboard-list"></i> Daily Reports Registry</h2>
          <span class="registry-count">${reports.length} reports</span>
        </div>
        <div class="registry-table-wrapper">
          <table class="registry-table">
            <thead><tr><th>Date</th><th>Area</th><th>Total</th><th>CAT</th><th>Rental</th><th>By</th><th>Actions</th></tr></thead>
            <tbody>
      `;
      
      reports.forEach(r => {
        html += `<tr>
          <td>${r.date}</td>
          <td>${r.area}</td>
          <td>${r.total_manpower}</td>
          <td>${r.manpower_cat}</td>
          <td>${r.manpower_rental}</td>
          <td>${r.updated_by_name || r.created_by_name || '-'}</td>
          <td><button onclick="viewDailyReport(${r.id})" class="table-btn"><i class="fas fa-eye"></i></button></td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      
      let modal = $('#registryModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'registryModal';
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content registry-modal"><button class="close-btn" onclick="closeModal('registryModal')">×</button><div id="registryContent"></div></div>`;
        document.body.appendChild(modal);
      }
      $('#registryContent').innerHTML = html;
      modal.classList.add('show');
    } else if (typeof originalOpenAdminRegistry === 'function') {
      originalOpenAdminRegistry(type);
    }
  };

  // ========== USER PROFILE FUNCTIONS ==========
  
  async function openProfileModal() {
    openModal('profileModal');
    await loadUserProfile();
  }
  window.openProfileModal = openProfileModal;

  async function loadUserProfile() {
    try {
      const profile = await apiCall('/profile');
      if (!profile || profile.error) {
        showToast('Failed to load profile', 'error');
        return;
      }

      // Update readonly fields
      if ($('#profileEmployeeId')) $('#profileEmployeeId').textContent = profile.employee_id || '--';
      if ($('#profileName')) $('#profileName').textContent = profile.name || '--';
      if ($('#profileLevel')) $('#profileLevel').textContent = profile.level || 'Bronze';
      if ($('#profilePoints')) $('#profilePoints').textContent = profile.points || 0;

      // Update editable fields
      if ($('#profilePhone')) $('#profilePhone').value = profile.phone || '';
      if ($('#profileEmail')) $('#profileEmail').value = profile.email || '';
      if ($('#profileBio')) $('#profileBio').value = profile.bio || '';

      // Update avatar
      const avatarPreview = $('#profileAvatarPreview');
      if (avatarPreview) {
        if (profile.profile_pic) {
          avatarPreview.innerHTML = `<img src="${profile.profile_pic}" alt="Profile"/>`;
        } else {
          avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    
    const phone = $('#profilePhone')?.value?.trim() || '';
    const email = $('#profileEmail')?.value?.trim() || '';
    const bio = $('#profileBio')?.value?.trim() || '';
    
    const result = await apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify({ phone, email, bio })
    });

    if (result && !result.error) {
      // Update currentUser with new data
      if (currentUser) {
        currentUser.phone = result.phone;
        currentUser.email = result.email;
        currentUser.bio = result.bio;
      }
      // Refresh Settings display immediately
      loadSettingsData();
      showToast('Profile saved successfully', 'success');
      closeModal('profileModal');
    } else {
      showToast(result?.error || 'Failed to save profile', 'error');
    }
  }
  window.saveProfile = saveProfile;

  async function handleProfilePicUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photos', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      
      const data = await response.json();
      const url = data.urls?.[0] || data.url;
      if (url) {
        // Update profile with new picture
        await apiCall('/profile', {
          method: 'PUT',
          body: JSON.stringify({ profile_pic: url })
        });
        
        // Refresh avatar display
        const avatarPreview = $('#profileAvatarPreview');
        if (avatarPreview) {
          avatarPreview.innerHTML = `<img src="${url}" alt="Profile"/>`;
        }
        showToast('Profile picture updated', 'success');
      }
    } catch (err) {
      showToast('Failed to upload image', 'error');
    }
  }
  window.handleProfilePicUpload = handleProfilePicUpload;

  // ========== USERS INFO FUNCTIONS ==========
  
  let usersSearchTimeout = null;
  let usersCurrentPage = 1;

  async function openUsersInfoModal() {
    openModal('usersInfoModal');
    usersCurrentPage = 1;
    if ($('#usersSearchInput')) $('#usersSearchInput').value = '';
    await loadUsersList();
  }
  window.openUsersInfoModal = openUsersInfoModal;

  function debounceUsersSearch() {
    if (usersSearchTimeout) clearTimeout(usersSearchTimeout);
    usersSearchTimeout = setTimeout(() => {
      usersCurrentPage = 1;
      loadUsersList();
    }, 300);
  }
  window.debounceUsersSearch = debounceUsersSearch;

  async function loadUsersList(page = 1) {
    const container = $('#usersListContainer');
    const pagination = $('#usersPagination');
    if (!container) return;

    container.innerHTML = '<div class="loading-users"><i class="fas fa-spinner fa-spin"></i> Loading users...</div>';
    
    const query = $('#usersSearchInput')?.value?.trim() || '';
    const result = await apiCall(`/users?query=${encodeURIComponent(query)}&page=${page}&limit=10`);

    if (!result || result.error) {
      container.innerHTML = '<div class="no-users-found"><i class="fas fa-users"></i><p>Failed to load users</p></div>';
      return;
    }

    if (!result.users || result.users.length === 0) {
      container.innerHTML = '<div class="no-users-found"><i class="fas fa-search"></i><p>No users found</p></div>';
      if (pagination) pagination.innerHTML = '';
      return;
    }

    container.innerHTML = result.users.map(user => `
      <div class="user-card" onclick="viewUserProfile(${user.id})">
        <div class="user-avatar">
          ${user.profile_pic ? `<img src="${user.profile_pic}" alt="${user.name}"/>` : '<i class="fas fa-user"></i>'}
        </div>
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-meta">
            <span><i class="fas fa-id-badge"></i> ${user.employee_id}</span>
            <span class="user-level-badge ${(user.level || 'Bronze').toLowerCase()}">${user.level || 'Bronze'}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:.9rem;font-weight:600;color:#3b82f6;">${user.points || 0}</div>
          <div style="font-size:.65rem;color:var(--text-soft);">points</div>
        </div>
      </div>
    `).join('');

    // Render pagination
    if (pagination && result.totalPages > 1) {
      let paginationHtml = '';
      for (let i = 1; i <= result.totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i === result.page ? 'active' : ''}" onclick="loadUsersList(${i})">${i}</button>`;
      }
      pagination.innerHTML = paginationHtml;
    } else if (pagination) {
      pagination.innerHTML = '';
    }

    usersCurrentPage = result.page;
  }
  window.loadUsersList = loadUsersList;

  async function viewUserProfile(userId) {
    openModal('viewUserProfileModal');
    const content = $('#viewUserProfileContent');
    if (content) content.innerHTML = '<div class="loading-users"><i class="fas fa-spinner fa-spin"></i> Loading profile...</div>';

    const user = await apiCall(`/users/${userId}`);
    if (!user || user.error) {
      if (content) content.innerHTML = '<div class="no-users-found"><p>User not found</p></div>';
      return;
    }

    const levelClass = `level-${(user.level || 'Bronze').toLowerCase()}`;
    const streak = user.streak || 0;
    const streakClass = streak >= 15 ? 'streak-fire' : streak >= 7 ? 'streak-high' : streak >= 3 ? 'streak-medium' : 'streak-low';
    const positionDisplay = user.position || (user.role === 'admin' ? 'Administrator' : 'Safety Officer');

    const html = `
      <div class="view-profile-header">
        <div class="view-profile-avatar">
          ${user.profile_pic ? `<img src="${user.profile_pic}" alt="${user.name}"/>` : '<i class="fas fa-user"></i>'}
        </div>
        <div class="view-profile-name">${user.name}</div>
        <div class="view-profile-role">${positionDisplay}</div>
      </div>
      <div class="view-profile-body">
        <div class="view-profile-stats">
          <div class="view-profile-stat">
            <div class="view-profile-stat-value">${user.points || 0}</div>
            <div class="view-profile-stat-label">Points</div>
          </div>
          <div class="view-profile-stat ${levelClass}">
            <div class="view-profile-stat-value">${user.level || 'Bronze'}</div>
            <div class="view-profile-stat-label">Level</div>
          </div>
          <div class="view-profile-stat ${streakClass}">
            <div class="view-profile-stat-value">${streak}${streak >= 7 ? '<i class="fas fa-fire" style="font-size:.7rem;margin-left:.2rem"></i>' : ''}</div>
            <div class="view-profile-stat-label">Streak</div>
          </div>
        </div>
        <div class="view-profile-details">
          <div class="view-profile-item">
            <i class="fas fa-id-badge"></i>
            <span class="label">ID</span>
            <span>${user.employee_id}</span>
          </div>
          ${user.email ? `<div class="view-profile-item">
            <i class="fas fa-envelope"></i>
            <span class="label">Email</span>
            <a href="mailto:${user.email}" class="profile-link">${user.email}</a>
          </div>` : ''}
          ${user.phone ? `<div class="view-profile-item">
            <i class="fas fa-phone"></i>
            <span class="label">Phone</span>
            <a href="tel:${user.phone}" class="profile-link">${user.phone}</a>
          </div>` : ''}
          ${user.assigned_area ? `<div class="view-profile-item">
            <i class="fas fa-map-marker-alt"></i>
            <span class="label">Area</span>
            <span>${user.assigned_area}</span>
          </div>` : ''}
          ${user.bio ? `<div class="view-profile-item">
            <i class="fas fa-quote-left"></i>
            <span class="label">Bio</span>
            <span style="font-style:italic">${user.bio}</span>
          </div>` : ''}
        </div>
      </div>
    `;
    
    if (content) content.innerHTML = html;
  }
  window.viewUserProfile = viewUserProfile;

  // ========== INBOX / TASK REQUESTS ==========
  
  let canSendTasks = false;
  
  async function checkUnreadCounts() {
    if (!authToken) return;
    try {
      const result = await apiCall('/inbox/unread-count');
      if (result && !result.error) {
        const inboxDot = $('#inboxDot');
        const newsDot = $('#newsDot');
        
        if (inboxDot) inboxDot.style.display = result.tasks > 0 ? 'block' : 'none';
        if (newsDot) newsDot.style.display = result.news > 0 ? 'block' : 'none';
        
        canSendTasks = result.canSendTasks;
        const sendBtn = $('#sendTaskBtn');
        const sentTabBtn = $('#sentTabBtn');
        if (sendBtn) sendBtn.style.display = canSendTasks ? 'flex' : 'none';
        if (sentTabBtn) sentTabBtn.style.display = canSendTasks ? 'block' : 'none';
      }
    } catch (err) {
      console.error('Error checking unread counts:', err);
    }
  }
  
  function openInboxModal() {
    openModal('inboxModal');
    loadInboxReceived();
    if (canSendTasks) loadInboxSent();
    // Hide inbox red dot when viewing inbox
    const inboxDot = $('#inboxDot');
    if (inboxDot) inboxDot.style.display = 'none';
  }
  window.openInboxModal = openInboxModal;
  
  function switchInboxTab(tab) {
    $all('.inbox-tab').forEach(t => t.classList.remove('active'));
    $(`.inbox-tab[data-tab="${tab}"]`).classList.add('active');
    
    $('#inboxReceivedContainer').style.display = tab === 'received' ? 'block' : 'none';
    $('#inboxSentContainer').style.display = tab === 'sent' ? 'block' : 'none';
  }
  window.switchInboxTab = switchInboxTab;
  
  async function loadInboxReceived() {
    const container = $('#inboxReceivedContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-inbox"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    const requests = await apiCall('/inbox');
    if (!requests || requests.error || !Array.isArray(requests)) {
      container.innerHTML = '<div class="empty-inbox"><i class="fas fa-inbox"></i><p>No task requests</p></div>';
      return;
    }
    
    if (requests.length === 0) {
      container.innerHTML = '<div class="empty-inbox"><i class="fas fa-inbox"></i><p>No task requests yet</p></div>';
      return;
    }
    
    container.innerHTML = requests.map(req => renderTaskCard(req, 'received')).join('');
  }
  
  async function loadInboxSent() {
    const container = $('#inboxSentContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-inbox"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    const requests = await apiCall('/inbox/sent');
    if (!requests || requests.error || !Array.isArray(requests)) {
      container.innerHTML = '<div class="empty-inbox"><i class="fas fa-paper-plane"></i><p>No sent requests</p></div>';
      return;
    }
    
    if (requests.length === 0) {
      container.innerHTML = '<div class="empty-inbox"><i class="fas fa-paper-plane"></i><p>No sent requests yet</p></div>';
      return;
    }
    
    container.innerHTML = requests.map(req => renderTaskCard(req, 'sent')).join('');
  }
  
  function renderTaskCard(req, mode) {
    const isUnread = mode === 'received' && !req.is_read;
    const statusIcon = req.status === 'completed' ? 'fa-check-circle' : req.status === 'in_progress' ? 'fa-clock' : 'fa-hourglass-half';
    const statusLabel = req.status === 'completed' ? 'Completed' : req.status === 'in_progress' ? 'In Progress' : 'Pending';
    const personLabel = mode === 'received' ? `From: ${req.sender_name}` : `To: ${req.recipient_name}`;
    
    let responseHtml = '';
    if (req.status === 'completed' && (req.response_text || req.response_attachment)) {
      responseHtml = `
        <div class="task-response-section">
          <div class="task-response-label">Response</div>
          ${req.response_text ? `<div class="task-response-text">${req.response_text}</div>` : ''}
          ${req.response_attachment ? `<div class="task-response-attachment">
            <a href="${req.response_attachment}" target="_blank"><i class="fas fa-paperclip"></i> View Attachment</a>
          </div>` : ''}
        </div>
      `;
    }
    
    let actionHtml = '';
    if (mode === 'received' && req.status !== 'completed') {
      actionHtml = `
        <div class="task-request-actions">
          <button class="task-respond-btn" onclick="openTaskResponse(${req.id})">
            <i class="fas fa-reply"></i> Respond
          </button>
        </div>
      `;
    }
    
    return `
      <div class="task-request-card ${isUnread ? 'unread' : ''}" ${isUnread ? `onclick="markTaskRead(${req.id})"` : ''}>
        <div class="task-request-header">
          <div class="task-request-sender">${personLabel}</div>
          <div class="task-request-time">${formatRelativeTime(req.created_at)}</div>
        </div>
        <div class="task-request-message">${req.message}</div>
        <span class="task-request-status status-${req.status}">
          <i class="fas ${statusIcon}"></i> ${statusLabel}
        </span>
        ${responseHtml}
        ${actionHtml}
      </div>
    `;
  }
  
  function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  
  async function markTaskRead(taskId) {
    await apiCall(`/inbox/${taskId}/read`, 'PUT');
    checkUnreadCounts();
  }
  window.markTaskRead = markTaskRead;
  
  async function openTaskResponse(taskId) {
    const requests = await apiCall('/inbox');
    const task = requests.find(r => r.id === taskId);
    if (!task) return;
    
    const details = $('#taskResponseDetails');
    details.innerHTML = `
      <div class="task-request-sender">From: ${task.sender_name}</div>
      <div class="task-request-message" style="margin-top:.5rem;margin-bottom:0">${task.message}</div>
    `;
    
    $('#responseTaskId').value = taskId;
    $('#responseText').value = '';
    $('#responseAttachment').value = '';
    
    openModal('taskResponseModal');
    
    if (!task.is_read) {
      await markTaskRead(taskId);
      loadInboxReceived();
    }
  }
  window.openTaskResponse = openTaskResponse;
  
  async function openSendTaskModal() {
    openModal('sendTaskModal');
    
    const select = $('#taskRecipient');
    select.innerHTML = '<option value="">Loading...</option>';
    
    try {
      const res = await fetch(`${API}/inbox/recipients`, {
        headers: { 'Authorization': 'Bearer ' + authToken }
      });
      const users = await res.json();
      
      if (res.status === 403) {
        select.innerHTML = '<option value="">Permission denied</option>';
        showToast(users.error || 'You do not have permission to send task requests', 'error');
        return;
      }
      
      if (!users || users.error || !Array.isArray(users)) {
        select.innerHTML = '<option value="">No users available</option>';
        return;
      }
      
      if (users.length === 0) {
        select.innerHTML = '<option value="">No approved users found</option>';
        return;
      }
      
      select.innerHTML = '<option value="">-- Select a user --</option>' + 
        users.map(u => `<option value="${u.id}">${u.name} (${u.employee_id})${u.position ? ' - ' + u.position : ''}</option>`).join('');
    } catch (err) {
      console.error('Error loading recipients:', err);
      select.innerHTML = '<option value="">Error loading users</option>';
    }
  }
  window.openSendTaskModal = openSendTaskModal;
  
  // Form handlers
  const sendTaskForm = $('#sendTaskForm');
  if (sendTaskForm) {
    sendTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const recipient_id = parseInt($('#taskRecipient').value);
      const message = $('#taskMessage').value.trim();
      
      if (!recipient_id || !message) {
        alert('Please select a recipient and enter a message.');
        return;
      }
      
      const res = await fetch(`${API}/inbox/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ recipient_id, message })
      });
      const result = await res.json();
      if (result && !result.error) {
        closeModal('sendTaskModal');
        $('#taskMessage').value = '';
        loadInboxSent();
        alert('Task request sent successfully!');
      } else {
        alert(result?.error || 'Failed to send task request');
      }
    });
  }
  
  const taskResponseForm = $('#taskResponseForm');
  if (taskResponseForm) {
    taskResponseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const taskId = $('#responseTaskId').value;
      const responseText = $('#responseText').value.trim();
      const attachmentInput = $('#responseAttachment');
      
      if (!responseText && (!attachmentInput.files || attachmentInput.files.length === 0)) {
        alert('Please enter a response or attach a file.');
        return;
      }
      
      const formData = new FormData();
      formData.append('response_text', responseText);
      if (attachmentInput.files && attachmentInput.files[0]) {
        formData.append('attachment', attachmentInput.files[0]);
      }
      
      try {
        const res = await fetch(`${API}/inbox/${taskId}/respond`, {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + authToken },
          body: formData
        });
        const result = await res.json();
        
        if (result && !result.error) {
          closeModal('taskResponseModal');
          loadInboxReceived();
          checkUnreadCounts();
          alert('Response submitted successfully!');
        } else {
          alert(result?.error || 'Failed to submit response');
        }
      } catch (err) {
        alert('Error submitting response');
      }
    });
  }
  
  // Show inbox button when logged in
  function showInboxButton() {
    const inboxBtn = $('#inboxToggleButton');
    if (inboxBtn && authToken) {
      inboxBtn.style.display = 'flex';
      checkUnreadCounts();
    }
  }
  
  // Check unread counts periodically
  setInterval(() => {
    if (authToken) checkUnreadCounts();
  }, 60000); // Every minute
  
  // Initialize inbox button on page load
  if (authToken) {
    showInboxButton();
  }
  
  // Hook into login to show inbox button
  const originalLoginSuccess = window.onLoginSuccess;
  window.onLoginSuccess = function() {
    if (originalLoginSuccess) originalLoginSuccess();
    showInboxButton();
  };

})();
