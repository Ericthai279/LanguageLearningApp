import { View, Text, StyleSheet } from "react-native";

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        // justifyContent: "center",
        // alignItems: "center",
        flex: 1,
        borderColor: "blue", 
        borderWidth: 1,
    },
    item1: {
        backgroundColor: "orange",
        padding: 30,
    },
    item2: {
        backgroundColor: "cyan",
        padding: 30,
    },
    item3: {
        backgroundColor: "red",
        padding: 30,
    },
    item4: {
        backgroundColor: "violet",
        padding: 30,
    },
});

const FlexBox = () => {
    return (
        <View style={styles.container}>
            <View style={styles.item1}>
                <Text>Item 1</Text>
            </View>
            <View style={styles.item2}>
                <Text>Item 2</Text>
            </View>
            <View style={styles.item3}>
                <Text>Item 3</Text>
            </View>
            <View style={styles.item4}>
                <Text>Item 4</Text>
            </View>
        </View>
    );
};

export default FlexBox;