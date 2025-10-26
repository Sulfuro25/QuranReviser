# Translation System Guide

## 🎯 Current Status

✅ **COMPLETE** - All pages are now fully translated!

### Translated Pages:
- ✅ `settings.html` - Fully translated (settings, theme, font, reciter, translation, language, sync)
- ✅ `index.html` - Fully translated (hero, navigation cards, footer)
- ✅ `hifdh.html` - Fully translated (header, hero, dashboard metrics)
- ✅ `reader.html` - Fully translated (header, landing, tabs, controls, drawer, footer)
- ✅ `mushaf.html` - Fully translated (header, landing, tabs, controls, drawer, footer)
- ✅ `hifdh-test.html` - Fully translated (header, test modes, features, footer)
- ✅ `tajwid.html` - Fully translated (header, content, footer)
- ✅ `surahs.html` - Fully translated (header, tabs, search, footer)

### Languages Supported:
- 🇬🇧 English (en)
- 🇸🇦 Arabic (ar) with RTL support
- 🇫🇷 French (fr)
- 🇳🇱 Dutch (nl)

## 📚 How the Translation System Works

### 1. **Translation Data** (`assets/js/i18n.js`)
All translations are stored in a single JavaScript object:

```javascript
const translations = {
  en: { key: "English text" },
  ar: { key: "النص العربي" },
  fr: { key: "Texte français" },
  nl: { key: "Nederlandse tekst" }
};
```

### 2. **HTML Markup**
Use `data-i18n` attributes to mark translatable content:

```html
<!-- For text content -->
<h1 data-i18n="quranReader">Quran Reader</h1>
<p data-i18n="selectWhereToStart">Select where to start reading</p>

<!-- For placeholders -->
<input type="search" data-i18n-placeholder="search" placeholder="Search..." />
```

### 3. **Automatic Translation**
When the page loads or language changes:
1. `initLanguage()` is called
2. It applies translations via `applyTranslations(lang)`
3. All elements with `data-i18n` attributes get their content updated
4. All elements with `data-i18n-placeholder` attributes get their placeholder updated
5. For Arabic, RTL mode is automatically enabled

### 4. **Dynamic JavaScript Content**
For dynamically generated content, use the `t()` helper function:

```javascript
// Get translation for a key
const translatedText = t('quranReader');

// Update element
element.textContent = t('settings');
```

## 🚀 Adding New Translations

### Method 1: Simple Text (Recommended for new pages)

**Step 1**: Add the translation key to `i18n.js`:

```javascript
const translations = {
  en: {
    myNewKey: "My new English text",
    // ...
  },
  ar: {
    myNewKey: "النص العربي الجديد",
    // ...
  },
  // ... repeat for fr and nl
};
```

**Step 2**: Use in HTML:

```html
<p data-i18n="myNewKey">My new English text</p>
```

### Method 2: Batch Translation Script (For many keys)

Create a JSON file with new keys:

```json
{
  "en": {
    "newFeature": "New Feature",
    "anotherKey": "Another text"
  },
  "ar": {
    "newFeature": "ميزة جديدة",
    "anotherKey": "نص آخر"
  }
}
```

Then merge into i18n.js programmatically.

## 💡 Best Practices

### ✅ DO:
- Use semantic key names: `quranReader`, `selectWhereToStart`
- Group related keys with comments: `// Reader Page`
- Keep keys consistent across languages
- Use `data-i18n-placeholder` for input placeholders
- Test all 4 languages after adding new content
- Use the `t()` function for JavaScript-generated content

### ❌ DON'T:
- Don't use spaces in keys: `my key` ❌ → `myKey` ✅
- Don't hardcode text in HTML when translation exists
- Don't forget to add keys to ALL 4 languages
- Don't use HTML tags inside translation values (use `<br>` sparingly)
- Don't mix `data-i18n` with manual content updates

## 🔧 Troubleshooting

### Text not translating?
1. Check if key exists in `translations` object
2. Verify `data-i18n="keyName"` attribute is correct
3. Ensure `i18n.js` is loaded before page scripts
4. Check browser console for errors
5. Confirm `initLanguage()` is called on `DOMContentLoaded`

### Arabic not showing RTL?
1. Check if `document.documentElement.dir = 'rtl'` is set
2. Verify CSS supports RTL layout
3. Ensure `body.rtl` class is added

### Language not persisting?
1. Check `localStorage.getItem('qr_language')`
2. Verify `setLanguage(lang)` is called on change
3. Confirm no JavaScript errors in settings page

## 📊 Translation Coverage

**Total Translation Keys**: ~150+

### Breakdown by Category:
- **Header/Navigation**: 8 keys
- **Settings Page**: 50+ keys
- **Home Page**: 20+ keys
- **Hifdh Page**: 15+ keys
- **Reader Page**: 25+ keys
- **Mushaf Page**: 20+ keys
- **Hifdh Test Page**: 25+ keys
- **Tajwid Page**: 8+ keys
- **Surahs Page**: 10+ keys
- **Common**: 15+ keys

## 🎨 Efficiency Tips

### For future page additions:

1. **Plan your keys first**:
   ```
   Write down all text that needs translation
   Create key names (camelCase)
   Group by section
   ```

2. **Use AI for translation**:
   ```
   Give GPT/Claude the English keys
   Ask for Arabic/French/Dutch translations
   Copy-paste into i18n.js
   ```

3. **Test incrementally**:
   ```
   Add 10-15 keys at a time
   Test in browser immediately
   Fix issues before adding more
   ```

4. **Template for new page**:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <!-- ... -->
   </head>
   <body>
     <!-- content with data-i18n attributes -->
     
     <script src="../assets/js/i18n.js"></script>
     <script src="your-page-script.js"></script>
     <script>
       document.addEventListener('DOMContentLoaded', () => {
         initLanguage();
       });
     </script>
   </body>
   </html>
   ```

## 🔄 Future Enhancements

### Potential improvements:
1. **External JSON files**: Move translations to separate JSON files for easier management
2. **Translation validation**: Script to check all keys exist in all languages
3. **Interpolation**: Support for dynamic values: `t('greeting', { name: 'Ahmed' })`
4. **Pluralization**: Handle singular/plural forms automatically
5. **Lazy loading**: Only load needed translations per page
6. **Translation editor**: Simple web UI to edit translations

## 📝 Notes

- The current system is simple and effective for this project size
- All translations are loaded on every page (lightweight, ~50KB)
- LocalStorage is used for language persistence
- RTL support is fully implemented for Arabic
- Custom event `qr:language-changed` allows cross-component updates

---

**Last Updated**: Oct 25, 2025  
**Total Translation Keys**: 150+  
**Languages**: 4 (en, ar, fr, nl)  
**Pages Translated**: 8/8 ✅
