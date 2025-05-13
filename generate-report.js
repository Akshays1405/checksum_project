const fs = require('fs');
const path = require('path');

async function generateEnhancedReport() {
  try {
    const jsonResultsPath = path.join(__dirname, 'test-results', 'test-results.json');
    
    if (!fs.existsSync(jsonResultsPath)) {
      console.error('Test results JSON file not found. Run tests first.');
      return;
    }
    
    const rawData = fs.readFileSync(jsonResultsPath, 'utf8');
    const testResults = JSON.parse(rawData);
    
    const enhancedReportDir = path.join(__dirname, 'enhanced-report');
    if (!fs.existsSync(enhancedReportDir)) {
      fs.mkdirSync(enhancedReportDir, { recursive: true });
    }
    
    const testSummary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      scores: [],
      testDetails: []
    };
    
    if (testResults.suites && Array.isArray(testResults.suites)) {
      testResults.suites.forEach(suite => {
        processPlaywrightSuite(suite, testSummary);
      });
    }
    
    const overallScore = testSummary.total > 0 
      ? Math.round((testSummary.passed / testSummary.total) * 100) 
      : 0;
    
    const htmlContent = generateHtmlReport(testSummary, overallScore);
    
    const reportPath = path.join(enhancedReportDir, 'enhanced-report.html');
    fs.writeFileSync(reportPath, htmlContent);
    
    console.log(`Enhanced test report generated at: ${reportPath}`);
    console.log(`Overall Test Score: ${overallScore}%`);
    console.log(`Tests: ${testSummary.total}, Passed: ${testSummary.passed}, Failed: ${testSummary.failed}, Skipped: ${testSummary.skipped}`);
    
  } catch (error) {
    console.error('Error generating enhanced report:', error);
  }
}

function processPlaywrightSuite(suite, summary) {
  if (suite.specs && Array.isArray(suite.specs)) {
    suite.specs.forEach(spec => {
      summary.total++;
      
      let status = 'unknown';
      let duration = 0;
      let error = null;
      
      if (spec.tests && spec.tests.length > 0) {
        const test = spec.tests[0];
        
        if (test.results && test.results.length > 0) {
          const result = test.results[0];
          status = result.status;
          duration = result.duration;
          error = result.errors && result.errors.length > 0 ? result.errors[0] : null;
        }
      }
      
      if (status === 'passed') {
        summary.passed++;
      } else if (status === 'failed') {
        summary.failed++;
      } else if (status === 'skipped') {
        summary.skipped++;
      }
      
      const score = status === 'passed' ? 1 : 0;
      summary.scores.push(score);
      
      summary.testDetails.push({
        title: spec.title,
        fullTitle: `${suite.title} › ${spec.title}`,
        file: spec.file || suite.file,
        status,
        duration,
        error,
        score
      });
    });
  }
}

    function generateHtmlReport(summary, overallScore) {
  summary.testDetails.sort((a, b) => {
    if (a.status === 'failed' && b.status !== 'failed') return -1;
    if (a.status !== 'failed' && b.status === 'failed') return 1;
    return 0;
  });
  
  const testDetailsHtml = summary.testDetails.map(test => {
    const statusClass = test.status === 'passed' ? 'success' : 
                       test.status === 'failed' ? 'danger' : 
                       'warning';
    
    const errorHtml = test.error ? 
      `<div class="error-details">
         <pre>${escapeHtml(test.error.message || '')}</pre>
         ${test.error.stack ? `<pre class="error-stack">${escapeHtml(test.error.stack)}</pre>` : ''}
       </div>` : '';
    
    return `
      <div class="card mb-3 test-card ${statusClass}-border">
        <div class="card-header bg-${statusClass} text-white d-flex justify-content-between">
          <span>${escapeHtml(test.fullTitle)}</span>
          <span>Score: ${test.score}/1</span>
        </div>
        <div class="card-body">
          <p><strong>File:</strong> ${escapeHtml(test.file)}</p>
          <p><strong>Status:</strong> <span class="badge bg-${statusClass}">${typeof test.status === 'string' ? test.status.toUpperCase() : test.status ? 'PASSED' : 'FAILED'}</span></p>
          <p><strong>Duration:</strong> ${test.duration}ms</p>
          ${errorHtml}
        </div>
      </div>
    `;
  }).join('');
  
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Test Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
      body { padding: 20px; }
      .success-border { border-left: 5px solid #198754; }
      .danger-border { border-left: 5px solid #dc3545; }
      .warning-border { border-left: 5px solid #ffc107; }
      .error-details { margin-top: 15px; background-color: #f8f9fa; padding: 10px; border-radius: 5px; }
      .error-stack { font-size: 0.8em; color: #6c757d; margin-top: 10px; max-height: 200px; overflow-y: auto; }
      .score-container { font-size: 2rem; }
      .progress { height: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="mb-4">Enhanced Test Report</h1>
      
      <div class="card mb-4">
        <div class="card-header bg-primary text-white">
          <h2 class="h4 mb-0">Test Summary</h2>
        </div>
        <div class="card-body">
          <div class="row align-items-center mb-3">
            <div class="col-md-4">
              <div class="score-container text-center">
                <span class="display-1 fw-bold ${overallScore >= 70 ? 'text-success' : overallScore >= 40 ? 'text-warning' : 'text-danger'}">${overallScore}%</span>
                <p class="lead">Overall Score</p>
              </div>
            </div>
            <div class="col-md-8">
              <div class="row mb-2">
                <div class="col-sm-3">Total Tests:</div>
                <div class="col-sm-9 fw-bold">${summary.total}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-3">Passed:</div>
                <div class="col-sm-9 fw-bold text-success">${summary.passed}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-3">Failed:</div>
                <div class="col-sm-9 fw-bold text-danger">${summary.failed}</div>
              </div>
              <div class="row mb-2">
                <div class="col-sm-3">Skipped:</div>
                <div class="col-sm-9 fw-bold text-warning">${summary.skipped}</div>
              </div>
              <div class="progress mt-3">
                <div class="progress-bar bg-success" role="progressbar" style="width: ${(summary.passed / summary.total) * 100}%" 
                     aria-valuenow="${summary.passed}" aria-valuemin="0" aria-valuemax="${summary.total}">
                  ${Math.round((summary.passed / summary.total) * 100)}%
                </div>
                <div class="progress-bar bg-danger" role="progressbar" style="width: ${(summary.failed / summary.total) * 100}%" 
                     aria-valuenow="${summary.failed}" aria-valuemin="0" aria-valuemax="${summary.total}">
                  ${Math.round((summary.failed / summary.total) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <h2 class="mb-3">Test Details</h2>
      ${testDetailsHtml}
    </div>
    
    <script>
      // Add some interactivity
      document.addEventListener('DOMContentLoaded', function() {
        // Add click handler to expand/collapse error stacks
        document.querySelectorAll('.card-header').forEach(header => {
          header.addEventListener('click', function() {
            const errorStack = this.closest('.test-card').querySelector('.error-stack');
            if (errorStack) {
              errorStack.style.display = errorStack.style.display === 'none' ? 'block' : 'none';
            }
          });
        });
      });
    </script>
  </body>
  </html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

generateEnhancedReport();

module.exports = { generateEnhancedReport }; 