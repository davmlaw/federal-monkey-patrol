// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:52:02 2005
// Last modified: Sun Apr 10 14:52:02 2005

#include "sound/music.h"
#include "sound/soundmanager.h"
#include <iostream>

using namespace std;

const string Music::DIR = "data/sound/music/";


Music::Music()
{

}


Music::~Music()
{
    cout << "~music()\n";
    if (music) {
	halt();
	Mix_FreeMusic(music);
    }
}


void Music::load(const string& name)
{
    if (!SoundManager::hasSound()) return;
    string filename = DIR + name;
    music = Mix_LoadMUS(filename.c_str());
    if (!music) {
	cout << "Could not load '" << name << "'\n";
    } else {
	cout << "Loaded '" << name << "'\n";
    }
}


void Music::load(const string& name, int ch)
{
    load(name);
}


void Music::play()
{
    if (music) {
	Mix_PlayMusic(music, 1);
    }
}


void Music::loop()
{
    if (music) {
	Mix_PlayMusic(music, -1);
    }
}


void Music::fade()
{
    int fadeOutSpeed = 1280; // ?

    if ( music ) {
	Mix_FadeOutMusic(fadeOutSpeed);    
    }
}


void Music::halt()
{
    if ( music && !done() ) {
	Mix_HaltMusic();
    }
}


bool Music::done()
{
    bool playing = false;
    if( music ) {
	if( Mix_PlayingMusic() )
	    playing = true;
    }
    return !playing;
}
