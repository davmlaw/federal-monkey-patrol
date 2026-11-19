// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Apr 16 22:18:51 2005
// Last modified: Sat Apr 16 22:18:51 2005

#ifndef WORDLIST2D
#define WORDLIST2D

#include "graphics/2d/drawable2d.h"
#include "util/string_util.h"
#include <string>
#include <vector>

typedef std::vector<Drawable2D*> textlist_t;

/**
 * Draws text (word wrapped) 
 */
class WordList2D : public Drawable2D {
public:
    WordList2D(GLfloat w, GLfloat h, strings_t& wordlist);
    virtual ~WordList2D();
    virtual void representation(GLfloat alpha);
    unsigned int getWordCount(void) { return wordCount; };
private:
    textlist_t text;
    unsigned int wordCount;
};


#endif // WORDLIST2D
