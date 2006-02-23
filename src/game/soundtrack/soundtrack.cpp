// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Apr 16 18:15:15 2005
// Last modified: Sat Apr 16 18:15:15 2005

#include "game/soundtrack/soundtrack.h"
#include "sound/soundmanager.h"
#include <iostream>

using namespace std;


SoundTrack::SoundTrack()
{

}


SoundTrack::~SoundTrack()
{

}


void SoundTrack::_play(Uint32 msecs, Input* input, float alpha)
{
    cout << "playing '" << filename << "'\n";
    SoundManager::Instance().playMusic(SoundManager::MUSIC1);
    status = PLAYING;
}
