// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:20:13 2005
// Last modified: Sun Apr 10 14:20:13 2005

#ifndef SOUNDMANAGER
#define SOUNDMANAGER

#include "sdl_opengl.h"
#include "sound/sound.h"

/**
 * Manages game sound & Music.
 * Based on sound code from Tumiki Fighters by Kenta Cho
 * http://www.asahi-net.or.jp/~cs8k-cyu/windows/tf_e.html
 */
class SoundManager {
public:
    virtual ~SoundManager();
    static SoundManager& Instance(void);
    static bool  hasSound(void) { return sound; };
    void  setMusicVolume(float vol);
    float getMusicVolume(void);
    void  setSFXVolume(float vol);
    float getSFXVolume(void);

    enum channel_t { // there can be 8
	DEFAULT,
	INFORMATIONAL,
	STORY,
	EXPLOSIONS,
	GUNS,
	CRITTERS,
	SIX,
	SEVEN
    };

    enum music_t {
	NONE,
	MUSIC1,
	NUM_MUSIC
    };
    enum sfx_t {
	CHAINGUN,
	KONG_ROAR,
	MENU_MOVE,
	NUM_SFX
    };
    void playSFX(sfx_t sfx);
    void playMusic(music_t music);
protected:
    SoundManager();
private:
    static bool sound;
    char* music_filename[NUM_MUSIC];
    char*   sfx_filename[NUM_SFX];
    Sound* sfx[NUM_SFX];
    Sound* music;
    music_t current_music;
};

#endif // SOUNDMANAGER
