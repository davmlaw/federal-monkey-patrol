// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:52:00 2005
// Last modified: Sun Apr 10 14:52:00 2005

#include "sound/chunk.h"
#include "sound/soundmanager.h"
#include <iostream>

using namespace std;

const string Chunk::DIR = "data/sound/sfx/";

Chunk::Chunk(): chunk(0)
{

}


Chunk::~Chunk()
{
    if (chunk) {
	halt();
	Mix_FreeChunk(chunk);
    }
}


void Chunk::load(const string& name)
{
    load(name, 0);
}


void Chunk::load(const string& name, int ch)
{
    if (!SoundManager::hasSound()) return;
    string filename = DIR + name;
    if( !(chunk = Mix_LoadWAV( filename.c_str() )) ) {
	cout << "Error loading '" << filename << "': "
	     << SDL_GetError() << "\n";
    } else
	cout << "loaded '" << filename << "'\n";
    channel = ch;
}


void Chunk::play()
{
    if (chunk) {
	Mix_PlayChannel(channel, chunk, 0);
    }
}

void Chunk::halt()
{
    if (chunk) {
	Mix_HaltChannel(channel);
    }
}

void Chunk::fade()
{
    ;
}


bool Chunk::done()
{
    bool playing = false;
    if( chunk ) {
	if( Mix_Playing(channel) )
	    playing = true;
    }
    return !playing;
}
