#!/usr/bin/perl
use DBI;
use DBD::Oracle qw(:ora_session_modes);
$|=1;
$userid = $ARGV[0];
$password = $ARGV[1];
$first_name = $ARGV[2];
$last_name = $ARGV[3];
$organisation = $ARGV[4];
$room_and_building = $ARGV[5];
$unix = $ARGV[6];
$email = $ARGV[7];

#######################


#######################
$do_test = 0;
if ($do_test == 1) {
    print "1:$userid\n";
    print "2:$password\n";
    print "3:$first_name\n";
    print "4:$last_name\n";
    print "5:$organisation\n";
    print "6:$room_and_building\n";
    print "7:$unix\n";
    print "9:$email\n";
};

if (($userid eq '') or ($password eq '') or ($first_name eq '') or ($last_name eq '') or ($organisation eq '') or ($room_and_building eq '') or ($unix eq '') or ($email eq '')) {
    print "Usage:./beehive_user.pl <userid> <password> <first_name> <last_name> <organisation LCB, Contur, SfL> <building_and_room> <Structure searching> <email> \n";
    exit;
};
$unix =~ tr/a-z/A-Z/;
$userid =~ tr/a-z/A-Z/;

if (($organisation ne 'LCB') and ($organisation ne 'Contur') and ($organisation ne 'SfL')) {
    print "Organisation must be one of the following:\n";
    print "LCB , Contur, SfL\n";
    exit;
};

if ($do_test == 0) {
# First create the oracle account.
    $db = DBI->connect('dbi:Oracle:beehive','sys','barbar', {ora_session_mode => ORA_SYSDBA,RaiseError => 1});
    $ora = "";
    $ora = "select username from dba_users where username=\'$userid\'";
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $found_ora = 0;
    $do->bind_columns(undef,\$X);
    while ($do->fetch) {
	if ($X eq $userid) {
	    $found_ora = 1;
	};
    };
    $do->finish();
    if ($found_ora == 0) {
	$ora = "create user \"$userid\" identified by \"$password\" default tablespace \"BCPVS_DATA\" quota unlimited on BCPVS_DATA account unlock";
	$do = $db->prepare(qq{
	    $ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();
    };
    if ($found_ora == 1) {
	print "User $userid already has an oracle account, granting roles\n";
	$ora = "alter user \"$userid\" quota unlimited on bcpvs_data account unlock";
	$do = $db->prepare(qq{
	    $ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();
    };

    $ora="grant beehive_user to \"$userid\"";
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $do->finish();

    if (($organisation eq 'LCB') or ($organisation eq 'Contur')) {
    	$ora="grant beehive_read to \"$userid\"";
    }
    elsif(($organisation eq 'SfL')) {
    	$ora="grant sfl_read to \"$userid\"";
    };
	
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $do->finish();

    if ($organisation eq 'SfL') {
	$ora="grant sfl_beehive_read to \"$userid\"";
	$do = $db->prepare(qq{
	$ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();
    };
    

    $ora="grant connect to \"$userid\"";
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $do->finish();

    $ora="grant resource to \"$userid\"";
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $do->finish();

    if (($organisation eq 'LCB') or ($organisation eq 'Contur')) {
	$ora="grant cimsstock to \"$userid\"";
	$do = $db->prepare(qq{
	$ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();

	$ora="grant cool_dispatch to \"$userid\"";
	$do = $db->prepare(qq{
	$ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();

	$ora="grant glass_admin to \"$userid\"";
	$do = $db->prepare(qq{
	$ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();
	}
    if ($unix eq 'Y') {
	print "Granting JCHEM stuff!!!\n";
	system "/home/oracle/jchem_pl_hacks/setup_jchem_search_user.pl $userid";
    };

    $ora="alter user \"$userid\" default role all";
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $do->finish();
    $db->disconnect;
};

# Now we must insert into user_details;
$db = DBI->connect('dbi:Oracle:beehive','hive','chemical', {RaiseError => 1});
# Update unix_account=Y if requested unix account.
if ($unix eq 'Y') {
    $ora="";
    $ora="update user_details set UNIX_ACCOUNT=\'Y\' where USERID=\'$userid\'";
    $do = $db->prepare(qq{
	$ora});
    $do->execute or die "$DBI::errstr";
    $do->finish();
};
$ora = "";
$ora = "select userid from user_details where userid=\'$userid\'";
$do = $db->prepare(qq{
    $ora});
$do->execute or die "$DBI::errstr";
$found = 0;
$do->bind_columns(undef,\$X);
while ($do->fetch) {
    if ($X eq $userid) {
	$found = 1;
	print "User $userid already in Hive\n";
    };
};
$do->finish();
if ($found == 0) {
    $hive_parent = "HIVE_CORP_USERS";
    $hivelocation = "HIVE_CORP_USERS";
    if ($organisation eq 'SfL') {
	$hive_parent = "HIVE_SFL_USERS";
	$hivelocation = "HIVE_CORP_USERS";
    };
    $_ = $last_name;
    /(.)/;
    $_ = $1;
    if (/([A-D])/) {
	$hive_parent = $hive_parent . "_AD";
	$hivelocation = $hivelocation . "_AD";
    };
    if (/([E-H])/) {
	$hive_parent = $hive_parent . "_EH";
	$hivelocation = $hivelocation . "_EH";
    };
    if (/([I-L])/) {
	$hive_parent = $hive_parent . "_IL";
	$hivelocation = $hivelocation . "_IL";
    };
    if (/([M-P])/) {
	$hive_parent = $hive_parent . "_MP";
	$hivelocation = $hivelocation . "_MP";
    };
    if (/([Q-T])/) {
	$hive_parent = $hive_parent . "_QT";
	$hivelocation = $hivelocation . "_QT";
    };
    if (/([U-Y])/) {
	$hive_parent = $hive_parent . "_UY";
	$hivelocation = $hivelocation . "_UY";
    };
    if (/([Z-Ö])/) {
	$hive_parent = $hive_parent . "_ZÖ";
	$hivelocation = $hivelocation . "_ZÖ";
    };
    $hivelocation = $hivelocation . "_" . $userid;
    if ($unix ne 'Y') {
	$unix = 'N';
    };
    $ora = "";
    $ora = "insert into user_details(userid,firstname,lastname,hivelocation,hiveparentlocation,unix_account,location,organisation,email) values(\'$userid\',\'$first_name\',\'$last_name\',\'$hivelocation\',\'$hive_parent\',\'$unix\',\'$room_and_building\',\'$organisation\',\'$email\')";
    print "ORA:$ora\n";
    if ($do_test == 0) {
	$db = DBI->connect('dbi:Oracle:beehive','hive','chemical', {RaiseError => 1});
	$do = $db->prepare(qq{
	    $ora});
	$do->execute or die "$DBI::errstr";
	$do->finish();
	$db->disconnect;
    };
};


print "\n";
print "Sending mail\n";

open (MAIL,"|/usr/lib/sendmail -t -F'Beehive account created'\n");
print MAIL "To: $email\n";
print MAIL "Subject:Beehive account created\n";
print MAIL "\n";
print MAIL "\n";
if ($found_ora == 0) {
    print MAIL "Username:$userid\n";
    print MAIL "Password:$password\n";
};
if ($found_ora == 1) {
    print MAIL "You already have an account,\n";
    print MAIL "Granted access to BeeHive for you.\n";
};
print MAIL "Please change your password by using \'tools\' menu in BeeHive\n";
print MAIL ".\n";
close MAIL;

exit;

