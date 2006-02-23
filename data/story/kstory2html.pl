#!/usr/bin/perl -w

%portrait = (
	"Harlow" => "harlow_headshot.png",
	"Chief" => "chief_headshot.jpg",
	"Mayor" => "mayor_headshot.jpg",
	"Boffin" => "boffin_headshot.png"
);

print <<EOT;
<HTML>
<BODY BGCOLOR="white">
EOT

while (<>) {
	chomp;
	next unless /^storyteller (.*)/;
	$shot = $1;
	print "<HR><P>\n<I>$shot</I>\n";
	open FILE, "$shot" or die "Can't open $shot: $!";
	while ( <FILE> ) {
		next if /^#/;
		if (/^picture (.*)/) {
			$pic = $1;
			print "<P><IMG SRC=\"$pic\" width=\"50%\" height=\"50%\">"
		} elsif (/^SOUND/ ) {
			next;
		} elsif (/^([^:]*):(.*)/) {
			$who = $1;
			if( lc $who ne "narrator" ) {
				print "<IMG SRC=\"$portrait{$who}\" width=\"64\" height=\"64\"> ";
			}
			$text = $2;
			print "$text";
		}
		print "<BR>";
	}
	close FILE;
}

print <<EOT;
</BODY>
</HTML>
EOT
