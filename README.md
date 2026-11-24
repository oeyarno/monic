<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5dd04c6a-0df9-4b92-b584-c836c5654e79

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Material Classification

The material catalog follows `material gorup class.xlsx`: it contains exactly 22 Material Groups and 55 CL02 classes (class type 001). Each Material Group allows its spreadsheet-defined classes; when creating or changing a material in MM01/MM02, select both the Material Group and one of its classes. CT04 characteristics shown and validated for the material come from that selected class.

The XLS template asks for both MATKL and CLASS and includes the selected class's characteristic columns. Import validates that the class belongs to the selected Material Group. Database schema version 26 migrates legacy groups and material assignments to the spreadsheet catalog after creating a database backup.

The material search clue dictionary is corporate-level master data shared by every company. Add, edit, or delete an entry once from MM60; MMBE, MM03, and material search in all tenants use the same dictionary. Schema version 28 consolidates existing company dictionaries into the corporate dictionary and creates a database backup.
