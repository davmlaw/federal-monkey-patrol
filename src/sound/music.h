// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:52:02 2005
// Last modified: Sun Apr 10 14:52:02 2005

#ifndef MUSIC
#define MUSIC

#include "../sdl_opengl.h"
#include "sound/sound.h"

/*
 * Music sample
 * @see SoundManager
 * Based on sound code from Tumiki Fighters by Kenta Cho
 * http://www.asahi-net.or.jp/~cs8k-cyu/windows/tf_e.html
 */
class Music : public Sound {
public:
    Music();
    virtual ~Music();
    void load(const std::string& name);
    void load(const std::string& name, int ch);
    void play();
    void loop(void);
    void fade();
    void halt();
    bool done();
private:
    Mix_Music* music;
    static const std::string DIR;
};

#endif // MUSIC
