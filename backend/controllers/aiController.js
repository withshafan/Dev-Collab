const axios = require('axios');

const reviewCode = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code to review is required.' });
    }

    const prompt = `You are a senior ${language} developer doing a code review.

Analyze the following code and respond in this exact structure:

---

**STATUS**: [choose one: "Has Errors" | "Works But Needs Improvement" | "Good Code"]

**ANALYSIS**:
- What the code does (1-2 lines max)
- Key observations (logic, structure, readability, security)

---

If STATUS is "Has Errors":

**ERRORS FOUND**:
List each error clearly. For each one:
- What the error is
- Why it breaks or risks the code

**CORRECTED CODE**:
\`\`\`${language}
// paste the fully corrected code here, no errors
\`\`\`

**WHAT CHANGED**: Bullet list of every fix made and why.

---

If STATUS is "Works But Needs Improvement":

**WHAT CAN BE IMPROVED**:
List 2-3 specific improvements (not vague advice).

**IMPROVED CODE**:
\`\`\`${language}
// paste the improved version here
\`\`\`

**WHAT CHANGED**: Bullet list of every change made and why.

---

If STATUS is "Good Code":

**STRENGTHS**: 2-3 specific things done well.
**SUGGESTION** (optional): One minor thing to consider, if any.

---

Be direct. No filler. No praise padding. Focus on substance.

Code to review:
\`\`\`${language}
${code}
\`\`\``;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000, // fixed: was 500, too low for full code blocks
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        timeout: 45000, // fixed: was 500ms, should be 45 seconds
      }
    );

    const review = response.data.choices[0].message.content;
    res.json({ review });

  } catch (error) {
    console.error('AI Review Error - Full:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    res.json({
      review: `⚠️ AI service temporarily unavailable. Here's a mock review for your ${language} code:\n\n- Code looks functional.\n- Consider adding error handling.\n- Use meaningful variable names.\n- Add comments for complex logic.`
    });
  }
};

module.exports = { reviewCode };