let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter(note =>
        note.text.toLowerCase().includes(searchWord)
    );
}

function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (const note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}

function countByCategory() {
    const counts = {};

    for (const note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}

function getSummary() {
    const counts = countByCategory();
    const word = notes.length === 1 ? "note" : "notes";

    return `${notes.length} ${word}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

function isDuplicate(text) {
    const cleanedText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === cleanedText
    );
}

function addNote(text, category) {
    const cleanedText = text.trim();

    if (cleanedText.length < 1 || cleanedText.length > 200) {
        console.log("Not added: note must be 1–200 characters.");
        return false;
    }

    if (isDuplicate(cleanedText)) {
        console.log("Not added: duplicate note.");
        return false;
    }

    if (!["personal", "work", "study"].includes(category)) {
        console.log("Not added: invalid category.");
        return false;
    }

    notes.push({
        id: notes.length + 1,
        text: cleanedText,
        category: category
    });

    console.log("Note added successfully.");
    return true;
}


// Test searchNotes
console.log(searchNotes("day"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log(searchNotes("pizza"));
// Expected: []


// Test longestNote
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

const originalNotes = [...notes];

notes = [];
console.log(longestNote());
// Expected: null

notes = [...originalNotes];


// Test countByCategory
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

notes = [];
console.log(countByCategory());
// Expected: {}

notes = [...originalNotes];


// Test getSummary
console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

notes = [originalNotes[0]];
console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

notes = [...originalNotes];


// Test isDuplicate
console.log(isDuplicate(" CALL MUM "));
// Expected: true

console.log(isDuplicate("Buy eggs"));
// Expected: false


// Test addNote
console.log(addNote("Plan weekend", "personal"));
// Expected: true

console.log(addNote("Plan weekend", "personal"));
// Expected: false