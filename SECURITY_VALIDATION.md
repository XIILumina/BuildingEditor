# Security Validation & Sanitization Guide

This document outlines all input validation and sanitization measures implemented across the BuildingEditor application.

## Overview

The application implements **defense-in-depth** with multi-layer validation:
1. **Request-level validation** (Laravel validation rules)
2. **Type casting & normalization** (PHP type system)
3. **Business logic validation** (domain-specific rules)
4. **Output encoding** (JSON, HTML escaping)
5. **Database security** (Eloquent ORM, parameterized queries)

---

## Frontend Validation (`resources/js/utils/validators.js`)

### Utility Functions

#### `sanitizeProjectName(name)`
- **Input**: User-provided project name
- **Validation Rules**:
  - Max 255 characters
  - Alphanumeric + spaces, hyphens, underscores
  - Trimmed whitespace
- **Output**: Sanitized string or empty string
- **Purpose**: Prevent XSS, SQL injection, path traversal

#### `validateEmail(email)`
- **Input**: Email address
- **Validation**: RFC 5322 compliant regex
- **Output**: Boolean
- **Purpose**: Ensure valid email format before submission

#### `sanitizeHtml(html)`
- **Input**: HTML string
- **Validation**: Strip all HTML tags
- **Output**: Plain text
- **Purpose**: Prevent XSS attacks

#### `sanitizeColor(color)`
- **Input**: Color value
- **Validation**: Hex format (#RRGGBB or #RGB)
- **Output**: Valid hex color or fallback (#9CA3AF)
- **Purpose**: Prevent CSS injection via color values

#### `validateProjectData(data)`
- **Input**: Project canvas data object
- **Validation**:
  - Strokes: array of objects with points, color, thickness
  - Shapes: array of objects with type, position, dimensions
  - Layers: array with id, name, order
  - Check all required fields present
- **Output**: Boolean
- **Purpose**: Verify data structure before API submission

#### `validateCoordinates(x, y)`
- **Input**: Numeric coordinates
- **Validation**:
  - Both must be finite numbers
  - Within canvas bounds (0-5000)
- **Output**: Boolean
- **Purpose**: Prevent invalid coordinate injection

---

## Backend Validation - ProjectController

### `store()` Method - Project Creation

**Request Validation Rules:**
```php
'name' => [
    'string',
    'min:1',
    'max:100',
    'regex:/^[a-zA-Z0-9\s\-_()]+$/'
]
```

**Security Features:**
- ✅ Max length enforcement (100 chars)
- ✅ Regex pattern whitelist (alphanumeric + space/hyphen/underscore/parenthesis)
- ✅ Custom error messages for user feedback
- ✅ User scope: Only authenticated users can create projects
- ✅ Output: JSON with project ID

**Protection Against:**
- XSS: Regex blocks HTML/script tags
- SQL Injection: No raw queries; Eloquent ORM used
- Path Traversal: No file path characters allowed

---

### `save()` Method - Full Project Data Persistence

#### Request-Level Validation
```php
$request->validate([
    'data' => 'nullable|array',
    'data.projectName' => 'nullable|string|max:100|regex:/^[a-zA-Z0-9\s\-_()]*$/',
    'data.layers' => 'nullable|array',
    'data.strokes' => 'nullable|array',
    'data.erasers' => 'nullable|array',
    'data.shapes' => 'nullable|array',
])
```

#### Layer Data Validation
**Rules:**
- Name: trimmed, fallback to "Layer" if empty
- Order: cast to integer

**Protection:**
- ✅ Empty name handling
- ✅ Type coercion prevents type juggling attacks

#### Stroke Data Validation
**Rules:**
- Points: Array of `{x, y}` pairs with finite numeric values
- Color: Hex format (`#RRGGBB` or `#RGB`) with fallback to `#ffffff`
- Thickness: Integer 1-200 (clamped)
- Material: String, max 255 chars, trimmed, nullable
- Layer ID: Must reference existing layer in project

**Validation Logic:**
```php
foreach ($points as $pt) {
    if (!is_array($pt) || !isset($pt['x'], $pt['y']) || 
        !is_numeric($pt['x']) || !is_numeric($pt['y']) ||
        !is_finite($pt['x']) || !is_finite($pt['y'])) {
        continue 2; // Skip invalid stroke
    }
}
```

**Protection:**
- ✅ Prevents array injection attacks
- ✅ Ensures numeric types with `is_finite()` (prevents Infinity/NaN)
- ✅ Thickness bounds prevent performance DoS
- ✅ Color validation prevents CSS injection

#### Eraser Data Validation
**Rules:**
- Points: Same as strokes (array of finite `{x, y}` pairs)
- Thickness: Integer 1-200 (clamped)

**Protection:**
- ✅ Consistent with stroke validation
- ✅ Prevents coordinate injection

#### Shape Data Validation
**Type Whitelist:**
- `rect`, `circle`, `oval`, `polygon` (only)

**Rules for All Shapes:**
- Coordinates (x, y): Finite numbers
- Rotation: Float, normalized to 0-360 range
- Color: Hex format with validation
- Layer ID: Must reference existing layer

**Type-Specific Validation:**

**Rect:**
- Width/Height: Must be positive, finite
- Skips if dimensions ≤ 0

**Circle:**
- Radius: Must be positive, finite
- Skips if radius ≤ 0

**Oval:**
- RadiusX/RadiusY: Must be positive, finite
- Skips if either ≤ 0

**Polygon:**
- Points: Array of finite `{x, y}` pairs (min 3 points = 6 values)
- Fill color: Hex format
- Closed: Boolean flag
- Skips if points invalid or insufficient

**Protection:**
- ✅ Type whitelist prevents arbitrary shape injection
- ✅ Finite number checks prevent Infinity/NaN attacks
- ✅ Dimension validation prevents performance DoS
- ✅ Polygon point validation prevents buffer overflow scenarios

#### Project Settings Validation
**Grid Size:**
- Integer 0-1000 (clamped)

**Units:**
- Whitelist: `mm`, `cm`, `m`, `in`, `ft`
- Set to null if invalid

**Draw Color:**
- Hex format validation with null fallback

**Thickness:**
- Integer 0-200 (clamped)

**Material:**
- String, max 100 chars, trimmed

**Protection:**
- ✅ Grid size bounds prevent rendering performance issues
- ✅ Units whitelist prevents injection via units field
- ✅ Color validation prevents CSS injection

---

## Backend Validation - OpenAIController

### `AiDrawSuggestion()` Method - AI-Generated Drawing Validation

#### Request Validation
```php
$request->validate([
    'prompt' => 'required|string|max:1000',
    'projectData' => 'required|json',
    'model' => 'nullable|string'
])
```

#### Grid Size Validation
```php
$gridSize = (int)($projectData['gridSize'] ?? 10);
if ($gridSize < 2) $gridSize = 10;
if ($gridSize > 200) $gridSize = 200; // Clamp 2-200
```

#### Comprehensive Output Normalization (`normalizeAiDrawing()`)

**Key Protections:**

1. **Hard Limits Enforcement:**
   - Max strokes: 100
   - Max shapes: 120
   - Max points per stroke: 300
   - Max points per polygon: 300
   - Max total points: 6000
   - Prevents memory exhaustion & DoS

2. **Stroke Normalization:**
   - Hex color validation: `#([A-Fa-f0-9]{6})$`
   - Thickness bounds: 1-200
   - Grid snapping: Rounds to grid size
   - Wall strokes: Enforced orthogonal (horizontal/vertical only)
   - Duplicate point deduplication: Removes consecutive identical points
   - Points trimmed to max per-stroke limit

3. **Shape Normalization:**
   - Type whitelist: rect, circle, oval, polygon only
   - Coordinate snapping: All to grid size
   - Dimension validation: Must exceed `gridSize / 2`
   - Color validation: Hex format with `#9ca3af` fallback
   - Rotation normalization: `fmod(rotation, 360)`

4. **Polygon Validation:**
   - Minimum 6 values (3 points)
   - Even count required
   - Points converted to numeric pairs
   - Local/absolute point format normalization
   - Enforces point limits

**Protection Against:**
- ✅ AI hallucinations: Validation filters impossible/invalid data
- ✅ Coordinate injection: Grid snapping & finite checks
- ✅ Buffer overflow: Point count limits
- ✅ Resource exhaustion: Hard limits on all counts
- ✅ Type confusion: Strict type casting & validation
- ✅ Malicious AI output: Comprehensive normalization pipeline

---

## Database Security

### Eloquent ORM Protection
- **All queries use Eloquent**: No raw SQL queries in ProjectController
- **Parameterized binding**: Automatic parameter binding prevents SQL injection
- **Example:**
  ```php
  Project::where('id', $id)
      ->where('user_id', auth()->id())
      ->firstOrFail();
  ```

### User Authorization
- **All queries scoped to authenticated user:**
  ```php
  ->where('user_id', auth()->id())
  ```
- **Prevents users from accessing other users' projects**

### Transaction Safety
- **Database transactions wrap complex operations:**
  ```php
  DB::transaction(function () { ... });
  ```
- **Ensures atomic updates: All or nothing**

### JSON Column Encoding
- **Arrays automatically JSON-encoded:**
  ```php
  'points' => is_array($s['points']) ? json_encode($s['points']) : $s['points']
  ```
- **Prevents array injection via SQL**

---

## CSRF Protection

### Global Axios Configuration (`resources/js/bootstrap.js`)
```javascript
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken.content;
```

### Per-Request Override (`resources/js/Pages/Editor/Editor.jsx`)
```javascript
headers: {
    'X-CSRF-TOKEN': csrfToken,
    'Content-Type': 'application/json'
}
```

**Protection:**
- ✅ Token extracted from meta tag
- ✅ Sent with every POST/PUT/DELETE request
- ✅ Laravel middleware validates token before processing

---

## File Upload Security (Future Recommendations)

If file uploads are added:
1. ✅ Validate file type (MIME type check)
2. ✅ Enforce max file size
3. ✅ Store outside webroot
4. ✅ Randomize filename
5. ✅ Scan for malware (optional: ClamAV integration)
6. ✅ Log all uploads with user ID & timestamp

---

## Audit Logging (Future Recommendations)

For compliance & forensics:
1. Log all project CREATE/UPDATE/DELETE operations
2. Include user ID, timestamp, old/new values
3. Track failed validation attempts
4. Alert on unusual activity (bulk deletes, rapid requests)

---

## Testing Validation

### Frontend Tests
```javascript
// Test validator functions
test('sanitizeProjectName strips special chars', () => {
    expect(sanitizeProjectName('Project<script>alert(1)</script>'))
        .toBe('Projectscriptalert1script');
});

test('validateCoordinates rejects non-finite', () => {
    expect(validateCoordinates(Infinity, 100)).toBe(false);
});
```

### Backend Tests
```php
// Test store() with invalid name
public function test_store_rejects_special_characters() {
    $response = $this->post('/api/projects', [
        'name' => 'Project<script>alert(1)</script>'
    ]);
    $response->assertStatus(422); // Validation error
}

// Test save() with invalid stroke
public function test_save_skips_invalid_strokes() {
    $response = $this->put('/api/projects/{id}', [
        'data' => [
            'strokes' => [
                ['points' => 'not an array'] // Invalid
            ]
        ]
    ]);
    $response->assertJson(['success' => true]); // Quietly skips
}
```

---

## Security Checklist

- ✅ Input validation on all user-controlled fields
- ✅ Type casting prevents type juggling
- ✅ Finite number checks prevent NaN/Infinity injection
- ✅ Hex color validation prevents CSS injection
- ✅ Shape type whitelist prevents arbitrary object creation
- ✅ Bounds clamping prevents DoS via resource exhaustion
- ✅ User scoping prevents unauthorized access
- ✅ Eloquent ORM prevents SQL injection
- ✅ CSRF token validation on all state-changing requests
- ✅ JSON encoding for array columns
- ✅ Transaction atomicity for data integrity
- ✅ Grid snapping & deduplication for data consistency
- ✅ Error messages don't leak sensitive info

---

## Deployment Checklist

Before production:
1. ✅ Set `APP_DEBUG=false` in `.env`
2. ✅ Set `APP_ENV=production` in `.env`
3. ✅ Enable HTTPS/TLS
4. ✅ Set `SESSION_SECURE_COOKIES=true` if HTTPS
5. ✅ Review `.env` for secrets (API keys, database credentials)
6. ✅ Run `php artisan config:cache`
7. ✅ Run `php artisan route:cache`
8. ✅ Enable WAF (Web Application Firewall) on server
9. ✅ Monitor logs for validation failures (potential attacks)
10. ✅ Regular security updates for Laravel & dependencies

---

## Related Documentation

- [Laravel Validation Docs](https://laravel.com/docs/11.x/validation)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
