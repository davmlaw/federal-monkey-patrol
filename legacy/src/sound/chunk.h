// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:52:00 2005
// Last modified: Sun Apr 10 14:52:00 2005

#ifndef CHUNK
#define CHUNK

#include "../sdl_opengl.h"
#include "sound/sound.h"

/**
 * Sound FX Sample
 * @see SoundManager
 * Based on sound code from Tumiki Fighters by Kenta Cho
 * http://www.asahi-net.or.jp/~cs8k-cyu/windows/tf_e.html
 */
class Chunk : public Sound {
public:
    Chunk();
    virtual ~Chunk();
    virtual void load(const std::string& name);
    virtual void load(const std::string& name, int ch);
    virtual void play();
    virtual void fade();
    virtual void halt();
    bool done();
private:
    Mix_Chunk* chunk;
    int channel;
    static const std::string DIR;
};

#endif // CHUNK
