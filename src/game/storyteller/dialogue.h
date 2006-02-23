// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Apr 16 21:46:00 2005
// Last modified: Sat Apr 16 21:46:00 2005

#ifndef DIALOGUE
#define DIALOGUE

#include "graphics/2d/container2d.h"
#include "graphics/2d/image.h"
#include "sound/chunk.h"
#include "util/string_util.h"

/**
 * Overlay which displays story text
 */
class Dialogue : public Drawable2D {
public:
    Dialogue(GLfloat w, GLfloat h, Image* i,strings_t& wordlist,
	     int msec_initial, int msec_per_word);
    virtual ~Dialogue();
    void representation(float alpha);
    void speak(Uint32 msecs);
    bool done(void);
private:
    Uint32 time_displayed;
    Uint32 time_total;
    Container2D* container;
    Chunk* sound;
    bool sound_started;
};

#endif // DIALOGUE
