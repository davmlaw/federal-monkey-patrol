// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Apr 10 14:20:13 2005
// Last modified: Sun Apr 10 14:20:13 2005

#include "graphics/display.h"
#include "sound/chunk.h"
#include "sound/music.h"
#include "sound/soundmanager.h"
#include <iostream>
#include <string.h>

using namespace std;

bool SoundManager::sound = false; // set to true if loaded ok

SoundManager::SoundManager():
    music(0),
    current_music(NONE)
{
    Display::Instance();

    cout << "SoundManager()\n";

    int audio_rate = 44100;
    Uint16 audio_format = AUDIO_S16;
    int audio_channels = 1;
    int audio_buffers = 4096;

    if( Mix_OpenAudio(audio_rate, audio_format,
		      audio_channels, audio_buffers) < 0) {
	cout << "Could not open Mixer\n";
	return;
    }
    sound = true;
    
    Mix_QuerySpec(&audio_rate, &audio_format, &audio_channels);
    cout << "audio_rate = " << audio_rate << endl;
    cout << "audio_format = " << audio_format << endl;
    cout << "audio_channels = " << audio_channels << endl;

    music_filename[MUSIC1] = "mmmskyscraper.ogg";

    memset(   sfx, 0, sizeof(Sound*) * NUM_SFX );

    sfx_filename[CHAINGUN]   = "chaingun.wav";
    sfx_filename[KONG_ROAR]  = "kong_roar.wav";
    sfx_filename[MENU_MOVE]  = "menu_move.wav";
    for( int i=0 ; i<NUM_SFX ; ++i ) {
	sfx[i] = new Chunk();
	sfx[i]->load( sfx_filename[i] );
    }
}


SoundManager::~SoundManager()
{
    if( !sound ) return;

    cout << "~SoundManager()\n";
    if (Mix_PlayingMusic()) {
	Mix_HaltMusic();
    }
    Mix_CloseAudio();
}


SoundManager& SoundManager::Instance(void)
{
    static SoundManager _instance;
    return _instance;
}


#define VOLUMEMAX 128.0f

void SoundManager::setMusicVolume(float vol)
{
    if( sound ) {
	Mix_VolumeMusic( (int)(vol * VOLUMEMAX) );
    }
}


float SoundManager::getMusicVolume(void)
{
    if( !sound ) return 0.0f;
    return Mix_VolumeMusic(-1) / VOLUMEMAX;
}


void SoundManager::setSFXVolume(float vol)
{
    if( sound ) {
	Mix_Volume( -1, (int)(vol * VOLUMEMAX) );
    }
}


float SoundManager::getSFXVolume(void)
{
    if( !sound ) return 0.0f;
    return Mix_Volume(-1, -1) / VOLUMEMAX;
}


void SoundManager::playSFX(sfx_t s)
{
    if( sound && s < NUM_SFX ) {
	if( sfx[s] )
	    sfx[s]->play();
    }
}


void SoundManager::playMusic(music_t m)
{
    cout << "playMusic()\n";

    if( sound && m > NONE && m < NUM_MUSIC ) {
	if( m != current_music ) {
	    delete music;
	    music = new Music();
	    music->load( music_filename[m] );
	    current_music = m;
	}
	music->play();
    }
}
